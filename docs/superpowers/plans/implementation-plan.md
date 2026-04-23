# NeuroCopilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build NeuroCopilot v1 — an AI support assistant with a FAISS + Groq Llama 3.3 70B RAG pipeline and a Next.js 16 frontend chat UI. No authentication in this phase (deferred to Future Plans).

**Architecture:** FastAPI backend (HuggingFace Spaces, Docker) exposes `/chat`, `/suggestions`, and `/health`. The RAG pipeline embeds each user question with `all-MiniLM-L6-v2`, retrieves top-k chunks from an in-memory FAISS index built from `qa_dataset.json` at boot, and calls Groq for grounded generation. The Next.js frontend (Netlify) is a single chat page driven by `NEXT_PUBLIC_API_URL`.

**Tech Stack:** FastAPI, pydantic-settings, groq SDK, FAISS CPU, sentence-transformers, Next.js 16, TypeScript 5, Tailwind CSS v4.

**Reference spec:** [docs/superpowers/specs/NeuroCopilot-plan.md](../specs/NeuroCopilot-plan.md) — note: auth sections in the spec are deferred per this plan's Future Plans section.

---

## File Structure

### Backend
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app, CORS, routers
│   ├── config.py                  # pydantic-settings
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── chat.py                # ChatRequest, ChatResponse, SuggestionsResponse
│   ├── services/
│   │   ├── __init__.py
│   │   ├── groq_client.py         # thin Groq wrapper + error handling
│   │   └── rag.py                 # retrieve → gate → generate orchestrator
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── embeddings.py          # sentence-transformers wrapper
│   │   └── index.py               # FAISS index builder + search
│   └── routes/
│       ├── __init__.py
│       └── chat.py                # /chat, /suggestions, /health
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── unit/
│   │   └── test_rag.py
│   └── integration/
│       └── test_chat.py
├── data/
│   └── qa_dataset.json
├── Dockerfile
├── requirements.txt
├── .env.example
└── .gitignore
```

### Frontend
```
frontend/
├── app/
│   ├── layout.tsx                 # existing
│   ├── page.tsx                   # main chat UI
│   ├── globals.css                # existing glassmorphism
│   └── (removed: login/, chat/)   # old login route deleted; chat lives at /
├── lib/
│   └── api.ts                     # fetch wrapper for backend
├── .env.example
└── .env.local                     # gitignored
```

**Responsibility split:** `services/` own business logic (pure functions, no HTTP), `routes/` are thin adapters, `schemas/` are Pydantic I/O shapes, `rag/` isolates the ML dependency surface.

---

## Phase 1: Backend Foundation

### Task 1: Backend project skeleton + config

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Write `requirements.txt`**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
pydantic==2.9.2
pydantic-settings==2.5.2
groq==0.11.0
faiss-cpu==1.8.0
sentence-transformers==3.0.1
httpx==0.27.2
pytest==8.3.3
pytest-asyncio==0.24.0
```

- [ ] **Step 2: Write `.env.example`**

```
GROQ_API_KEY=replace-with-groq-key
CORS_ORIGINS=http://localhost:3000
```

- [ ] **Step 3: Write `.gitignore`**

```
.env
.venv/
__pycache__/
*.pyc
.pytest_cache/
```

- [ ] **Step 4: Write `app/config.py`**

```python
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    groq_api_key: str
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 5: Write `tests/conftest.py`**

```python
import os
os.environ.setdefault("GROQ_API_KEY", "test-key")
```

- [ ] **Step 6: Install and verify**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest --co -q
```
Expected: pytest collects 0 tests, no import errors.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold FastAPI project with pydantic-settings config"
```

---

## Phase 2: RAG Pipeline

### Task 2: Embeddings wrapper

**Files:**
- Create: `backend/app/rag/__init__.py` (empty)
- Create: `backend/app/rag/embeddings.py`

- [ ] **Step 1: Write `rag/embeddings.py`**

```python
from functools import lru_cache
import numpy as np
from sentence_transformers import SentenceTransformer

_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    return SentenceTransformer(_MODEL_NAME)


def embed_texts(texts: list[str]) -> np.ndarray:
    model = _get_model()
    vectors = model.encode(texts, convert_to_numpy=True, normalize_embeddings=False)
    return vectors.astype("float32")


def embed_query(text: str) -> np.ndarray:
    return embed_texts([text])[0]
```

- [ ] **Step 2: Smoke-test**

```bash
cd backend
python -c "from app.rag.embeddings import embed_query; v = embed_query('hello'); print(v.shape, v.dtype)"
```
Expected: `(384,) float32` (first run downloads the model, ~100MB).

- [ ] **Step 3: Commit**

```bash
git add backend/app/rag/
git commit -m "feat(backend): add sentence-transformers embeddings wrapper"
```

---

### Task 3: FAISS index with dataset loader

**Files:**
- Create: `backend/app/rag/index.py`
- Ensure: `backend/data/qa_dataset.json` exists

- [ ] **Step 1: If needed, copy the dataset**

```bash
mkdir -p backend/data
cp data/qa_dataset.json backend/data/qa_dataset.json  # if it's still at repo root
```

- [ ] **Step 2: Write `rag/index.py`**

```python
import json
from dataclasses import dataclass
from pathlib import Path
import faiss
from app.rag.embeddings import embed_texts, embed_query

_DATASET_PATH = Path(__file__).resolve().parents[2] / "data" / "qa_dataset.json"


@dataclass
class RetrievedChunk:
    question: str
    answer: str
    score: float  # cosine similarity 0..1


class QAIndex:
    def __init__(self, dataset_path: Path = _DATASET_PATH):
        raw = json.loads(dataset_path.read_text(encoding="utf-8"))
        self._entries: list[dict] = raw
        questions = [e["question"] for e in raw]
        vectors = embed_texts(questions)
        dim = vectors.shape[1]
        self._index = faiss.IndexFlatL2(dim)
        self._index.add(vectors)

    @staticmethod
    def _l2_to_cosine(distance_sq: float) -> float:
        # For near-unit-length MiniLM embeddings, cosine ≈ 1 - d² / 2.
        return max(0.0, min(1.0, 1.0 - distance_sq / 2.0))

    def search(self, query: str, k: int = 3) -> list[RetrievedChunk]:
        qvec = embed_query(query).reshape(1, -1)
        distances, indices = self._index.search(qvec, k)
        out: list[RetrievedChunk] = []
        for dist_sq, idx in zip(distances[0], indices[0]):
            if idx < 0:
                continue
            entry = self._entries[int(idx)]
            out.append(RetrievedChunk(
                question=entry["question"],
                answer=entry["answer"],
                score=self._l2_to_cosine(float(dist_sq)),
            ))
        return out

    @property
    def all_questions(self) -> list[str]:
        return [e["question"] for e in self._entries]
```

- [ ] **Step 3: Smoke-test**

```bash
cd backend
python -c "from app.rag.index import QAIndex; idx = QAIndex(); r = idx.search('how do I reset my password'); print([(c.score, c.question) for c in r])"
```
Expected: 3 chunks with scores printed.

- [ ] **Step 4: Commit**

```bash
git add backend/app/rag/index.py
git commit -m "feat(backend): add FAISS QAIndex with dataset loading and search"
```

---

### Task 4: Groq client wrapper

**Files:**
- Create: `backend/app/services/__init__.py` (empty)
- Create: `backend/app/services/groq_client.py`

- [ ] **Step 1: Write `services/groq_client.py`**

```python
import logging
from groq import Groq
from app.config import get_settings

log = logging.getLogger(__name__)

_MODEL_ID = "llama-3.3-70b-versatile"
_TIMEOUT_SECONDS = 15


class GroqError(Exception):
    pass


def generate_answer(messages: list[dict]) -> str:
    settings = get_settings()
    client = Groq(api_key=settings.groq_api_key, timeout=_TIMEOUT_SECONDS)
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

    return completion.choices[0].message.content or ""
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/
git commit -m "feat(backend): add Groq client wrapper with timeout and error handling"
```

---

### Task 5: RAG orchestrator (retrieval → gate → generation)

**Files:**
- Create: `backend/app/services/rag.py`
- Create: `backend/tests/unit/__init__.py` (empty)
- Create: `backend/tests/unit/test_rag.py`

- [ ] **Step 1: Write failing tests**

`backend/tests/unit/test_rag.py`:
```python
from unittest.mock import patch, MagicMock
from app.services import rag as rag_svc
from app.rag.index import RetrievedChunk


def _chunks(scores: list[float]) -> list[RetrievedChunk]:
    return [RetrievedChunk(question=f"q{i}", answer=f"a{i}", score=s)
            for i, s in enumerate(scores)]


def test_low_confidence_returns_fallback_without_calling_groq():
    index = MagicMock()
    index.search.return_value = _chunks([0.1, 0.05, 0.0])

    with patch("app.services.rag.generate_answer") as mock_gen:
        result = rag_svc.answer("gibberish", index=index)

    assert result.source == "fallback"
    assert "don't have that information" in result.answer.lower()
    mock_gen.assert_not_called()


def test_high_confidence_calls_groq_and_returns_generated():
    index = MagicMock()
    index.search.return_value = _chunks([0.8, 0.7, 0.5])

    with patch("app.services.rag.generate_answer", return_value="Generated reply"):
        result = rag_svc.answer("real question", index=index)

    assert result.source == "rag"
    assert result.answer == "Generated reply"
    assert result.confidence == 0.8


def test_groq_error_returns_error_source():
    index = MagicMock()
    index.search.return_value = _chunks([0.8, 0.7, 0.5])

    with patch("app.services.rag.generate_answer", side_effect=rag_svc.GroqError("boom")):
        result = rag_svc.answer("question", index=index)

    assert result.source == "error"
    assert "busy" in result.answer.lower() or "try again" in result.answer.lower()


def test_build_prompt_includes_system_and_context():
    chunks = _chunks([0.8])
    messages = rag_svc._build_messages("my question", chunks)
    assert messages[0]["role"] == "system"
    assert "NeuroCopilot" in messages[0]["content"]
    assert messages[1]["role"] == "user"
    assert "my question" in messages[1]["content"]
    assert "q0" in messages[1]["content"]
    assert "a0" in messages[1]["content"]
```

- [ ] **Step 2: Run — expect failures**

```bash
pytest backend/tests/unit/test_rag.py -v
```

- [ ] **Step 3: Implement `services/rag.py`**

```python
from dataclasses import dataclass
from app.rag.index import QAIndex, RetrievedChunk
from app.services.groq_client import generate_answer, GroqError

_SYSTEM_PROMPT = (
    "You are NeuroCopilot, a helpful support assistant. "
    "Answer the user's question using ONLY the context provided below. "
    "If the context doesn't contain the answer, say "
    '"I don\'t have that information — could you rephrase or ask something else?" '
    "Be concise and direct. Do not invent facts. "
    'Do not mention the word "context" in your reply.'
)

_CONFIDENCE_THRESHOLD = 0.25
_FALLBACK_ANSWER = "I don't have that information — could you rephrase or ask something else?"
_ERROR_ANSWER = "The assistant is busy right now — please try again in a moment."


@dataclass
class RagResponse:
    answer: str
    confidence: float
    source: str  # "rag" | "fallback" | "error"


def _build_messages(question: str, chunks: list[RetrievedChunk]) -> list[dict]:
    ctx_blocks = "\n\n".join(f"Q: {c.question}\nA: {c.answer}" for c in chunks)
    user_msg = f"Context:\n{ctx_blocks}\n\nQuestion: {question}"
    return [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": user_msg},
    ]


def answer(question: str, *, index: QAIndex) -> RagResponse:
    chunks = index.search(question, k=3)
    best = chunks[0].score if chunks else 0.0

    if best < _CONFIDENCE_THRESHOLD:
        return RagResponse(answer=_FALLBACK_ANSWER, confidence=best, source="fallback")

    messages = _build_messages(question, chunks)
    try:
        generated = generate_answer(messages)
    except GroqError:
        return RagResponse(answer=_ERROR_ANSWER, confidence=best, source="error")

    return RagResponse(answer=generated, confidence=best, source="rag")
```

- [ ] **Step 4: Run — expect pass**

```bash
pytest backend/tests/unit/test_rag.py -v
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/rag.py backend/tests/
git commit -m "feat(backend): add RAG orchestrator with confidence gate and fallbacks"
```

---

## Phase 3: HTTP Layer

### Task 6: Chat + suggestions routes + app wiring

**Files:**
- Create: `backend/app/schemas/__init__.py` (empty)
- Create: `backend/app/schemas/chat.py`
- Create: `backend/app/routes/__init__.py` (empty)
- Create: `backend/app/routes/chat.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/integration/__init__.py` (empty)
- Create: `backend/tests/integration/test_chat.py`

- [ ] **Step 1: Write `schemas/chat.py`**

```python
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    answer: str
    confidence: float
    source: str


class SuggestionsResponse(BaseModel):
    suggestions: list[str]
```

- [ ] **Step 2: Write `routes/chat.py`**

```python
import random
from functools import lru_cache
from fastapi import APIRouter, Query
from app.rag.index import QAIndex
from app.services import rag as rag_svc
from app.schemas.chat import ChatRequest, ChatResponse, SuggestionsResponse

router = APIRouter(tags=["chat"])

_GREETING_TOKENS = {"hi", "hello", "hey", "yo", "sup", "greetings"}


@lru_cache(maxsize=1)
def _get_index() -> QAIndex:
    return QAIndex()


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    result = rag_svc.answer(req.message, index=_get_index())
    return ChatResponse(answer=result.answer, confidence=result.confidence, source=result.source)


@router.get("/suggestions", response_model=SuggestionsResponse)
def suggestions(n: int = Query(default=20, ge=1, le=50)):
    index = _get_index()
    candidates = [
        q for q in index.all_questions
        if q.strip().lower() not in _GREETING_TOKENS
    ]
    chosen = random.sample(candidates, k=min(n, len(candidates)))
    return SuggestionsResponse(suggestions=chosen)
```

- [ ] **Step 3: Write `app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routes import chat as chat_routes


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="NeuroCopilot API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    app.include_router(chat_routes.router)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
```

- [ ] **Step 4: Write integration tests**

`backend/tests/integration/test_chat.py`:
```python
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import create_app

client = TestClient(create_app())


def test_health_returns_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_chat_returns_rag_answer_when_groq_mocked():
    with patch("app.services.rag.generate_answer", return_value="Hi, how can I help?"):
        r = client.post("/chat", json={"message": "How do I reset my password?"})
    assert r.status_code == 200
    body = r.json()
    assert body["answer"]
    assert body["source"] in ("rag", "fallback")
    assert 0.0 <= body["confidence"] <= 1.0


def test_chat_rejects_empty_message():
    r = client.post("/chat", json={"message": ""})
    assert r.status_code == 422  # pydantic validation


def test_suggestions_returns_questions():
    r = client.get("/suggestions?n=5")
    assert r.status_code == 200
    assert len(r.json()["suggestions"]) <= 5


def test_suggestions_respects_max():
    r = client.get("/suggestions?n=100")
    assert r.status_code == 422  # ge=1, le=50
```

- [ ] **Step 5: Run all tests**

```bash
pytest backend/tests/ -v
```
Expected: all tests green.

- [ ] **Step 6: Smoke-test the live server**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```
In another shell:
```bash
curl -i http://localhost:8000/health
curl -i -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How do I reset my password?"}'
curl -i "http://localhost:8000/suggestions?n=5"
```
Expected: `200 OK` on all three; `/chat` returns a Groq-generated answer with confidence ≥ 0.25.

- [ ] **Step 7: Commit**

```bash
git add backend/app/ backend/tests/
git commit -m "feat(backend): add /chat, /suggestions, /health routes with integration tests"
```

---

## Phase 4: Backend Deployment

### Task 7: Dockerfile + startup

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Write `Dockerfile`**

```dockerfile
FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
```

- [ ] **Step 2: Build and smoke-test locally (optional)**

```bash
cd backend
docker build -t neurocopilot-backend .
docker run --rm -p 7860:7860 \
  -e GROQ_API_KEY=your-key \
  -e CORS_ORIGINS=http://localhost:3000 \
  neurocopilot-backend
```
Expected: server starts on port 7860; `curl http://localhost:7860/health` returns ok.

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile
git commit -m "chore(backend): add Dockerfile for HuggingFace Spaces deployment"
```

---

## Phase 5: Frontend

### Task 8: API client

**Files:**
- Create: `frontend/.env.example`
- Modify: `frontend/.gitignore` (add `.env.local`)
- Create: `frontend/lib/api.ts`

- [ ] **Step 1: Write `frontend/.env.example`**

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 2: Add `.env.local` to `.gitignore`**

Append to `frontend/.gitignore`:
```
.env.local
.env
```

- [ ] **Step 3: Write `lib/api.ts`**

```typescript
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type ChatResponse = {
  answer: string;
  confidence: number;
  source: "rag" | "fallback" | "error";
};

export const api = {
  chat: (message: string) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  suggestions: (n = 20) =>
    request<{ suggestions: string[] }>(`/suggestions?n=${n}`),
};
```

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/ frontend/.env.example frontend/.gitignore
git commit -m "feat(frontend): add typed API client for /chat and /suggestions"
```

---

### Task 9: Chat page (root route)

**Files:**
- Replace: `frontend/app/page.tsx` (currently a redirect)
- Delete: `frontend/app/login/` directory
- Delete: `frontend/app/chat/` directory (content moves to root)

- [ ] **Step 1: Remove old auth/chat route directories**

```bash
rm -rf frontend/app/login frontend/app/chat
```

- [ ] **Step 2: Replace `frontend/app/page.tsx`**

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, type ChatResponse } from "@/lib/api";

type Msg = { role: "user" | "bot"; text: string; confidence?: number };


export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bot", text: "Hi! Ask me anything." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.suggestions(20)
      .then((r) => setSuggestions(r.suggestions))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    try {
      const res: ChatResponse = await api.chat(text);
      setMessages((m) => [...m, { role: "bot", text: res.answer, confidence: res.confidence }]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "Something went wrong";
      setMessages((m) => [...m, { role: "bot", text: msg }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex">
      <aside className="hidden md:block w-80 border-r border-white/10 p-4 overflow-y-auto">
        <h2 className="text-sm uppercase tracking-wide text-white/50 mb-3">Try asking</h2>
        <ul className="space-y-2">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                onClick={() => send(s)}
                disabled={busy}
                className="text-left w-full text-sm text-white/80 hover:text-green-400 disabled:opacity-50"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 border-b border-white/10">
          <h1 className="font-bold">NeuroCopilot</h1>
        </header>
        <div ref={scroller} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div className={`inline-block max-w-[80%] p-3 rounded-2xl ${m.role === "user" ? "bg-green-500/20" : "glass-card"}`}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.confidence !== undefined && (
                  <p className="text-xs text-white/40 mt-1">
                    confidence: {Math.round(m.confidence * 100)}%
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="p-4 border-t border-white/10 flex gap-2"
        >
          <input
            className="glass-input flex-1"
            placeholder="Ask a question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button type="submit" disabled={busy} className="glass-button">Send</button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Confirm glass classes exist in `globals.css`**

If `.glass-card`, `.glass-input`, `.glass-button` aren't already defined, append to `frontend/app/globals.css`:

```css
.glass-card { backdrop-filter: blur(20px); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; }
.glass-input { padding: 0.6rem 0.9rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; }
.glass-input:focus { outline: none; border-color: rgb(34 197 94 / 0.5); }
.glass-button { padding: 0.6rem 1rem; background: rgb(34 197 94 / 0.2); border: 1px solid rgb(34 197 94 / 0.4); border-radius: 12px; color: white; transition: all 0.15s; }
.glass-button:hover:not(:disabled) { background: rgb(34 197 94 / 0.3); }
.glass-button:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/ frontend/app/globals.css
git commit -m "feat(frontend): replace login/chat routes with single chat page at root"
```

---

## Phase 6: End-to-End + Docs

### Task 10: Local end-to-end smoke test

**Files:** none (manual verification)

- [ ] **Step 1: Start backend**

```bash
cd backend
cp .env.example .env
# Edit .env: set GROQ_API_KEY
uvicorn app.main:app --reload --port 8000
```

- [ ] **Step 2: Start frontend in another shell**

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

- [ ] **Step 3: Manual smoke test**

1. Open http://localhost:3000 — see the chat page with suggestions sidebar.
2. Click a suggestion — receive a Groq-generated answer with confidence badge.
3. Type an in-scope question manually — receive a natural answer grounded in the dataset.
4. Type an out-of-scope question ("what is the capital of Mars?") — receive the fallback answer; backend logs show no Groq call.
5. Stop the backend and send a message — frontend shows a graceful error.

- [ ] **Step 4: Note any issues**

If any step fails, diagnose and fix. Add follow-up tasks as needed.

---

### Task 11: README update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite `README.md` to cover:**
  - One-paragraph project summary
  - Architecture diagram (copy from spec §5)
  - Tech stack (Python + FastAPI + FAISS + Groq; Next.js + TypeScript + Tailwind)
  - **Local development** — backend venv + uvicorn; frontend npm install + dev
  - **Environment variables** — link to `.env.example` files; note `GROQ_API_KEY` is required
  - **Deployment** — HF Spaces (backend), Netlify (frontend) with exact env-var names
  - **Rate limit note** — Groq free tier is 30 RPM; fallback is graceful
  - **Status** — "v1: public chat interface. Auth/accounts coming in v2 (see `docs/superpowers/plans/implementation-plan.md` Future Plans)."

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for v1 architecture and local/deploy setup"
```

---

### Task 12: Deploy backend to HuggingFace Spaces

**Files:** none (platform config)

- [ ] **Step 1: Push backend Docker setup to HF Space**

Create/update the HF Space to use Docker SDK with the `backend/` subtree. Set the secret `GROQ_API_KEY` and `CORS_ORIGINS` in the HF Spaces UI.

- [ ] **Step 2: Verify deployed endpoints**

```bash
curl https://<your-space>.hf.space/health
```
Expected: `{"status": "ok"}`

- [ ] **Step 3: Smoke-test chat via curl**

```bash
curl -i -X POST https://<your-space>.hf.space/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How do I reset my password?"}'
```
Expected: 200 with a Groq-generated answer.

---

### Task 13: Deploy frontend to Netlify

**Files:** none (platform config)

- [ ] **Step 1: Update Netlify env var**

In Netlify site settings, set `NEXT_PUBLIC_API_URL` to the deployed HF Space URL (HTTPS).

- [ ] **Step 2: Update backend `CORS_ORIGINS`**

Add the Netlify domain to HF Space secret `CORS_ORIGINS`. Restart the Space.

- [ ] **Step 3: Trigger Netlify build**

Push to `main` (or the deploy branch). Wait for build. Visit the Netlify URL.

- [ ] **Step 4: End-to-end production smoke test**

Repeat Task 10 Step 3, but against the deployed URLs.

---

## Success Criteria (v1)

- [ ] `GET /health` returns 200 on the deployed HF Space.
- [ ] `POST /chat` returns a Groq-generated answer grounded in retrieved context for in-scope questions.
- [ ] `POST /chat` returns a graceful fallback for out-of-scope questions, without calling Groq.
- [ ] `GET /suggestions` returns curated questions (greetings filtered out).
- [ ] Graceful error response when Groq times out or rate-limits (no 500 reaches the user).
- [ ] All secrets live in env vars; no hardcoded URLs, keys, or domains in source.
- [ ] Frontend loads the chat UI, fetches suggestions, and displays Groq answers with confidence badges.
- [ ] Full flow demoable end-to-end against the deployed HF Space + Netlify URLs.
- [ ] README documents architecture, env vars, local-dev, and deployment.
- [ ] Unit + integration tests green: RAG confidence gating, prompt construction, `/chat` happy path, `/suggestions` constraints.

---

## Rollback & Recovery Notes

- Each task is a separate commit — revert granularity is per-feature.
- FAISS index is rebuilt from `qa_dataset.json` on every backend boot — updating the dataset is a redeploy, no migration needed.
- If Groq deprecates `llama-3.3-70b-versatile`, the model ID is a single constant in `app/services/groq_client.py`.

---

## Future Plans

Items deferred from v1, ordered by expected value vs effort:

### 1. Authentication (deferred from this plan)

Full account system — JWT + bcrypt + SQLite (via SQLAlchemy + Alembic) + email verification + password reset with a stubbed email service. The design is already specified in [docs/superpowers/specs/NeuroCopilot-plan.md](../specs/NeuroCopilot-plan.md) §6.1–6.2.

**Work items to re-introduce when ready:**

- Add DB layer: SQLAlchemy 2.0 engine/session, Alembic migrations, `users`, `email_verification_tokens`, `password_reset_tokens` tables.
- Add services: `password.py` (bcrypt via `passlib`), `jwt.py` (HS256 via `python-jose`), `email.py` (Protocol + `ConsoleEmailService`), `auth.py` (signup, verify, login, resend-verification, forgot-password, reset-password) — all unit/integration tested.
- Add dependencies: `get_db`, `get_email_service`, `get_current_user` (JWT cookie).
- Add routes under `/auth`: `/signup`, `/login`, `/logout`, `/me`, `/verify-email`, `/resend-verification`, `/forgot-password`, `/reset-password`.
- Update `/chat` and `/suggestions` to require JWT.
- Switch CORS to `allow_credentials=True`, tighten origin list, set cookie with `HttpOnly; Secure; SameSite=None`.
- Frontend: add `/signup`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password` pages and a `useAuth` hook calling `/auth/me`. Update root page to redirect based on session. Update chat page to require login and include a logout button.
- Resolve the open question about HuggingFace Spaces persistent filesystem storage before committing to SQLite at `/data/neuro.db`; otherwise swap to a free hosted Postgres (Supabase / Neon / Turso).
- Add `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL`, `EMAIL_PROVIDER`, token TTL, and JWT expiry to `.env.example`.
- Re-add requirements: `sqlalchemy`, `alembic`, `passlib[bcrypt]`, `python-jose[cryptography]`, `pydantic[email]`, `email-validator`.

### 2. Rate limiting

Add `slowapi` (or similar) to `/chat` and, once auth lands, `/auth/login` and `/auth/forgot-password`. Protects the Groq free-tier budget and prevents brute-force on auth.

### 3. Conversation history

New-chat-session button, persistent `conversations` and `messages` tables, chat-list sidebar, message pagination. Depends on auth (users own their conversations) and on persistent DB storage.

### 4. Real email provider

Swap `ConsoleEmailService` for a Resend / Brevo / SendGrid implementation behind the existing `EmailService` Protocol. One new class, one-line change in the FastAPI dependency wiring.

### 5. Refresh tokens

Longer-lived sessions with silent rotation. Depends on auth.

### 6. OAuth (Google / GitHub)

Sign-in alongside email + password. Depends on auth.

### 7. Observability

Structured logging, per-request tracing, Groq call metrics, a simple dashboard.

### 8. Admin panel

View users, manage dataset, inspect chat logs. Depends on auth + DB.

### 9. Per-user knowledge bases

Upload documents; per-user FAISS indices; background ingestion workers. Depends on auth + persistent storage.

### 10. Fine-tuned model

Train a small domain model (Phi-3-mini / Gemma 2B) on the Q&A dataset, surface via a model toggle in the chat UI.
