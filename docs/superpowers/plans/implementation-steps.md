# NeuroCopilot — Groq Model Integration Steps

**Goal:** Add Groq Llama 3.3 70B generation to the existing backend RAG pipeline so `/chat` returns natural, grounded answers instead of verbatim dataset matches.

**Scope constraints:**
- **Backend only.** Frontend is not modified.
- **Response contract preserved.** `POST /chat` continues to return `{response: str, success: bool, confidence: float}` exactly as the frontend expects.
- **Existing auth, signup/login, suggestions, and health endpoints are untouched.**

**Files touched:**
- Modify: `backend/requirements.txt`
- Create: `backend/.env.example`
- Modify: `backend/.gitignore` (create if missing)
- Create: `backend/groq_client.py`
- Modify: `backend/rag_pipeline.py`

---

## Step 1 — Add Groq + dotenv to requirements

- [ ] Add two lines to `backend/requirements.txt`:

```
groq==0.11.0
python-dotenv==1.0.1
```

- [ ] Install locally:

```bash
cd backend
pip install -r requirements.txt
```

---

## Step 2 — Env var scaffolding

- [ ] Create `backend/.env.example`:

```
GROQ_API_KEY=replace-with-your-groq-key
```

- [ ] Create or update `backend/.gitignore` — ensure it contains:

```
.env
__pycache__/
*.pyc
.venv/
```

- [ ] Create a local `backend/.env` (do **not** commit):

```
GROQ_API_KEY=<your new, freshly rotated Groq key>
```

---

## Step 3 — Groq client wrapper

- [ ] Create `backend/groq_client.py`:

```python
import logging
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()  # reads backend/.env in local dev; ignored on HF Spaces

log = logging.getLogger(__name__)

_MODEL_ID = "llama-3.3-70b-versatile"
_TIMEOUT_SECONDS = 15


class GroqError(Exception):
    pass


def is_configured() -> bool:
    return bool(os.getenv("GROQ_API_KEY"))


def generate_answer(messages: list[dict]) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise GroqError("GROQ_API_KEY is not set")

    client = Groq(api_key=api_key, timeout=_TIMEOUT_SECONDS)
    try:
        completion = client.chat.completions.create(
            model=_MODEL_ID,
            messages=messages,
            temperature=0.3,
            max_tokens=500,
        )
    except Exception as e:
        log.error("Groq call failed: %s", e)
        raise GroqError(str(e)) from e

    return (completion.choices[0].message.content or "").strip()
```

---

## Step 4 — Update RAG pipeline to call Groq after retrieval

- [ ] Modify `backend/rag_pipeline.py`. Two changes:
  1. Retrieve top-3 chunks (already does `k=3`, but currently only uses the best).
  2. Below the confidence threshold → return fallback (unchanged). Above threshold → build a prompt from all 3 chunks and call Groq.

Replace the existing `get_response` method with:

```python
def get_response(self, query: str, k: int = 3) -> Tuple[str, float]:
    """
    Retrieve top-k chunks from FAISS, then call Groq to generate a grounded answer.
    Below the confidence threshold, skip Groq and return a canned fallback.
    """
    from groq_client import generate_answer, GroqError, is_configured

    if not self.vector_store:
        return (
            "Sorry, I could not find an answer for that. Please ask questions related to our platform.",
            0.0,
        )

    results = self.vector_store.similarity_search_with_score(query, k=k)
    if not results:
        return (
            "Sorry, I could not find an answer for that. Please ask questions related to our platform.",
            0.0,
        )

    best_doc, best_score = results[0]
    similarity = max(0.0, 1 - (best_score / 2))

    if similarity < self.similarity_threshold:
        return (
            "Sorry, I could not find an answer for that. Please ask questions related to our platform.",
            similarity,
        )

    # If Groq isn't configured, fall back to verbatim answer (existing behavior).
    if not is_configured():
        answer = best_doc.metadata.get(
            "answer",
            "Sorry, I could not find an answer for that. Please ask questions related to our platform.",
        )
        return answer, similarity

    # Build context from all retrieved chunks and call Groq.
    context_blocks = []
    for doc, _score in results:
        q = doc.metadata.get("question", "")
        a = doc.metadata.get("answer", "")
        context_blocks.append(f"Q: {q}\nA: {a}")
    context = "\n\n".join(context_blocks)

    system_prompt = (
        "You are NeuroCopilot, a helpful support assistant. "
        "Answer the user's question using ONLY the context provided below. "
        "If the context doesn't contain the answer, say "
        '"I could not find that in our knowledge base — could you rephrase?" '
        "Be concise and direct. Do not invent facts. "
        'Do not mention the word "context" in your reply.'
    )
    user_msg = f"Context:\n{context}\n\nQuestion: {query}"

    try:
        generated = generate_answer([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg},
        ])
    except GroqError:
        # Graceful fallback — return verbatim answer so the user still gets something useful
        answer = best_doc.metadata.get(
            "answer",
            "The assistant is busy right now — please try again in a moment.",
        )
        return answer, similarity

    return generated, similarity
```

- [ ] Leave `load_and_index_data`, `get_suggested_questions`, `get_rag_pipeline`, and the module-level singleton **unchanged**.

---

## Step 5 — Local smoke test

- [ ] Start the backend:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

- [ ] In another shell, hit `/chat` with a known in-scope question:

```bash
curl -i -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How do I reset my password?"}'
```

Expected: `200 OK`, body is `{"response": "<natural Groq-generated answer>", "success": true, "confidence": <0–100>}`. The answer should be phrased naturally, not a verbatim copy from the dataset.

- [ ] Hit `/chat` with an out-of-scope question:

```bash
curl -i -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the capital of Mars?"}'
```

Expected: `200 OK`, response contains the canned "Sorry, I could not find an answer…" string, `confidence` is below 25. Backend logs show **no Groq call** for this request (the pre-threshold check short-circuits).

- [ ] Confirm the frontend still works. Run `npm run dev` in `frontend/` with its existing `.env.local` pointing at `http://localhost:8000`. Ask a question through the UI — the response field should populate as before.

---

## Step 6 — Deploy to HuggingFace Spaces

- [ ] In the HF Space settings → **Repository secrets**, add:

```
GROQ_API_KEY = <your new Groq key>
```

(Do **not** put the key in `Dockerfile`, `requirements.txt`, or any committed file.)

- [ ] Push the changes:

```bash
git add backend/requirements.txt backend/groq_client.py backend/rag_pipeline.py backend/.env.example backend/.gitignore
git commit -m "feat(backend): add Groq RAG generation to /chat pipeline"
git push
```

- [ ] Wait for the Space to rebuild. Check logs for `Indexed N Q&A pairs into FAISS vector store` — confirms startup succeeded.

- [ ] Smoke-test against the deployed URL:

```bash
curl -i -X POST https://<your-space>.hf.space/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How do I reset my password?"}'
```

Expected: natural Groq-generated answer.

- [ ] Open the live Netlify frontend and ask a question end-to-end.

---

## Success Criteria

- [ ] `POST /chat` returns a Groq-generated natural answer for in-scope questions.
- [ ] `POST /chat` returns the canned fallback for out-of-scope questions **without** calling Groq.
- [ ] Response body shape is unchanged: `{response: str, success: bool, confidence: float}`.
- [ ] Frontend works without modification against both local and deployed backends.
- [ ] `GROQ_API_KEY` is read from environment; no key, URL, or secret appears in committed source.
- [ ] `/signup`, `/login`, `/suggestions`, `/health` continue to work as before (no regression).

---

## Rollback

Every change lives in three files (`groq_client.py` new, `rag_pipeline.py` modified, `requirements.txt` modified). To revert, `git revert` the single commit — the pre-Groq verbatim-answer behavior returns automatically because the old code path is preserved as the `is_configured() == False` branch.
