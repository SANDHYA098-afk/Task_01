# NeuroCopilot — Architecture & Workflow

This document describes the system design, request workflows, key technologies, and deployment topology of NeuroCopilot v1.

---

## 1. System Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────────┐         ┌──────────────────┐
│   Next.js 16 Frontend       │         │     FastAPI Backend              │         │   Groq API       │
│   (Netlify, free tier)      │         │     (HuggingFace Spaces)         │         │ Llama 3.3 70B    │
│                             │         │                                  │         │                  │
│  /login   /chat             │ HTTPS   │  /signup  /login                 │ HTTPS   │                  │
│                             │ ──────▶ │  /chat    /suggestions  /health  │ ──────▶ │                  │
│  - sessionStorage(user)     │         │                                  │         │                  │
│  - NEXT_PUBLIC_API_URL      │ ◀────── │  - SHA-256 password hashing      │ ◀────── │                  │
│                             │         │  - users_db.json                 │         └──────────────────┘
│  Glassmorphism UI,          │         │  - CORS allowlist (env)          │
│  typing animation,          │         │  - RAG: FAISS + Groq             │         ┌──────────────────┐
│  confidence badges          │         │                                  │ ──────▶ │  FAISS index     │
└─────────────────────────────┘         └──────────────────────────────────┘         │  (in-memory,     │
                                                                                     │  built at boot)  │
                                                                                     │                  │
                                                                                     │  + qa_dataset    │
                                                                                     │  .json (55 Q&A)  │
                                                                                     └──────────────────┘
```

**Three deployable units, all on free tiers:**
- **Frontend** → Netlify (Next.js build)
- **Backend** → HuggingFace Spaces (Docker)
- **LLM** → Groq's hosted Llama 3.3 70B API

---

## 2. Component Breakdown

### 2.1 Frontend (Next.js 16)

| File | Responsibility |
|------|----------------|
| [frontend/app/layout.tsx](../frontend/app/layout.tsx) | Root layout, metadata, fonts (Geist + Geist Mono) |
| [frontend/app/page.tsx](../frontend/app/page.tsx) | Root route — redirects to `/login` |
| [frontend/app/login/page.tsx](../frontend/app/login/page.tsx) | Combined login + signup with toggle, password validation, post-signup state |
| [frontend/app/chat/page.tsx](../frontend/app/chat/page.tsx) | Main chat UI: message list, suggestions sidebar, typing animation, theme toggle |
| [frontend/app/globals.css](../frontend/app/globals.css) | Glassmorphism design system: `.glass-card`, `.glass-input`, `.glass-button`, theme variables |

**State management:**
- Auth → `sessionStorage("user")` set on login, cleared on logout
- Theme → `localStorage("theme")` toggled with the header switch
- Messages, input, suggestions → React `useState` in `/chat`

**Configuration:**
- `process.env.NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`)
- Set in [frontend/.env.local](../frontend/.env.local) for dev, Netlify env vars for prod

### 2.2 Backend (FastAPI)

| File | Responsibility |
|------|----------------|
| [backend/main.py](../backend/main.py) | FastAPI app, CORS middleware, route registration, startup lifespan |
| [backend/auth.py](../backend/auth.py) | `signup_user()` and `login_user()` — SHA-256 hashing, JSON file I/O |
| [backend/models.py](../backend/models.py) | Pydantic request/response models (`UserSignup`, `LoginRequest`, `ChatRequest`, `ChatResponse`, etc.) |
| [backend/rag_pipeline.py](../backend/rag_pipeline.py) | `RAGPipeline` class — FAISS index, retrieval, confidence gate, Groq orchestration |
| [backend/groq_client.py](../backend/groq_client.py) | Groq SDK wrapper: `generate_answer()`, `is_configured()`, `GroqError` exception |
| [backend/users_db.json](../backend/users_db.json) | Persistent user store (single file, hashed passwords) |
| [backend/Dockerfile](../backend/Dockerfile) | Python 3.10 + dependency install + uvicorn entrypoint on port 7860 |

**Endpoints:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/` | Public | Status check |
| `POST` | `/signup` | Public | Create new user account |
| `POST` | `/login` | Public | Verify credentials, return user object |
| `POST` | `/chat` | Public¹ | Run RAG pipeline → return generated answer |
| `GET` | `/suggestions?n=20` | Public¹ | Return curated questions from dataset (greetings filtered) |
| `GET` | `/health` | Public | Liveness check for HF Spaces |

¹ *v1 has no JWT enforcement on chat endpoints. Adding auth to `/chat` is on the v2 roadmap.*

### 2.3 RAG Pipeline

The heart of the system. Located in [backend/rag_pipeline.py](../backend/rag_pipeline.py).

**Initialization (at backend boot):**

1. Load `data/qa_dataset.json` (55 curated Q&A pairs).
2. For each entry, build a document with the question + answer as content, and the original Q & A in metadata.
3. Embed all questions using `sentence-transformers/all-MiniLM-L6-v2` (384-dim, normalized).
4. Build an in-memory `FAISS` index from those embeddings.

**At query time** — see workflow §3 below.

### 2.4 Knowledge Base

[data/qa_dataset.json](../data/qa_dataset.json) — 55 curated `{question, answer}` pairs covering platform features, technical concepts (RAG, LangChain, FAISS), and common support questions. Versioned in git.

The index rebuilds on every backend restart (~1 second for 55 entries) — no separate indexing pipeline needed.

---

## 3. Request Workflows

### 3.1 Signup Flow

```
Browser (login page, "Sign up" mode)
   │
   │  POST /signup  { name, email, password }
   ▼
FastAPI /signup  →  signup_user()
   │
   ├──  hash password (SHA-256)
   ├──  read users_db.json
   ├──  check email not already taken
   ├──  append new user record
   └──  write users_db.json
   │
   ▼
Response  { success: true, user: { name, email } }
   │
Browser stores user in sessionStorage  →  router.push("/chat")
```

### 3.2 Chat Flow (RAG + Groq)

This is where the magic happens. Three stages:

```
Browser  (chat page)
   │
   │  POST /chat  { message: "How do I reset my password?" }
   ▼
FastAPI /chat  →  rag.get_response(message)
   │
   │  ── STAGE 1: RETRIEVAL ──────────────────────────────────────
   │
   ├──  embed_query("How do I reset my password?")  →  384-dim vector
   ├──  faiss_index.similarity_search_with_score(query_vec, k=3)
   ├──  → returns top-3 documents with L2 distances
   ├──  best_score = top result's L2 distance
   ├──  similarity = max(0, 1 − L2² / 2)        // L2 → cosine approximation
   │
   │  ── STAGE 2: CONFIDENCE GATE ────────────────────────────────
   │
   ├──  IF similarity < 0.25 (threshold):
   │       return ("Sorry, I could not find an answer…", similarity)
   │       ← Groq is NEVER called for out-of-scope queries
   │
   │  ── STAGE 3: GROQ GENERATION ────────────────────────────────
   │
   ├──  IF GROQ_API_KEY not set:
   │       return (best_doc.metadata["answer"], similarity)  // verbatim fallback
   │
   ├──  Build prompt with all 3 retrieved Q&A pairs as context:
   │
   │       SYSTEM:  "You are NeuroCopilot. Answer using ONLY the
   │                 context. Be concise. Don't invent facts."
   │       USER:    "Context:\n  Q: …\n  A: …\n\n  Q: …\n  A: …\n\n  Q: …\n  A: …
   │                 \n\nQuestion: How do I reset my password?"
   │
   ├──  groq_client.generate_answer(messages)
   │       │
   │       ├──  Groq client = Groq(api_key, timeout=15s)
   │       ├──  client.chat.completions.create(
   │       │       model="llama-3.3-70b-versatile",
   │       │       temperature=0.3,
   │       │       max_tokens=500
   │       │     )
   │       └──  return generated_text
   │
   ├──  IF GroqError (timeout / rate-limit / network):
   │       fallback to best_doc.metadata["answer"] (verbatim)
   │
   └──  return (generated_answer, similarity)
   │
   ▼
Response  { response, success: true, confidence: similarity * 100 }
   │
Browser appends bot message with typing animation, displays confidence badge
```

**Key properties of this design:**
- **Cost-aware**: out-of-scope questions never hit the Groq API.
- **Resilient**: any failure mode degrades gracefully to a verbatim dataset answer rather than 500-ing.
- **Grounded**: the system prompt forces the LLM to use only the retrieved context, preventing hallucinations.
- **Fast**: Groq returns 70B-parameter answers in ~1 second.

### 3.3 Suggestions Flow

```
Browser (chat page mounts)
   │
   │  GET /suggestions?n=20
   ▼
FastAPI /suggestions
   │
   ├──  Take all questions from qa_dataset.json
   ├──  Filter out greetings ("hi", "hello", "hey")
   └──  Return first n
   │
   ▼
Response  { questions: [...] }
   │
Browser populates left sidebar — clicking sends as a chat message
```

---

## 4. Key Technology Choices

### 4.1 Why FAISS + sentence-transformers (vs hosted vector DB)

- **Free, no external service** — fits the free-tier deployment goal
- **Fast at this scale** — 55 entries fit comfortably in memory; rebuild on boot is trivial
- **Industry-standard** — FAISS is Facebook AI's mature vector library; `all-MiniLM-L6-v2` is the most-used sentence embedding model on HuggingFace
- **Portable** — easy to migrate to Pinecone / Weaviate / pgvector later if the dataset grows

### 4.2 Why Groq (vs OpenAI / Anthropic / self-hosted)

- **Free tier**: 30 RPM, generous daily token budget, no credit card
- **Speed**: Groq's LPU hardware delivers 70B-parameter inference at ~500 tokens/sec — answers feel instant
- **Open-source model**: Llama 3.3 70B is high-quality and switchable to other Groq-hosted models via a single constant
- **Standard SDK**: `groq` Python package mirrors the OpenAI SDK shape

### 4.3 Why Next.js 16 + Tailwind v4 (vs plain React, Vue, etc.)

- **App Router** for clean file-based routing
- **TypeScript** out of the box for type safety
- **Tailwind v4** for rapid styling with a small bundle
- **Netlify integration** is one-click via `@netlify/plugin-nextjs`

### 4.4 Why FastAPI (vs Flask / Django / Express)

- **Async-first** — pairs well with HTTP calls to Groq
- **Pydantic-based validation** — typed request/response models
- **Auto-generated OpenAPI docs** at `/docs`
- **Lightweight** — fits on HF Spaces' free Docker tier

---

## 5. Configuration

### Backend ([backend/.env.example](../backend/.env.example))

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `GROQ_API_KEY` | Yes (for Groq mode) | — | Groq API key from console.groq.com |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowlist of origins |

**Behavior when `GROQ_API_KEY` is not set:** the pipeline falls back to verbatim dataset answers (legacy v0 behavior). The system stays operational.

### Frontend ([frontend/.env.example](../frontend/.env.example))

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend base URL for all `/login`, `/signup`, `/chat`, `/suggestions` calls |

`.env`, `.env.local` are gitignored. `.env.example` files are committed for reference.

---

## 6. Deployment Topology

```
                     ┌───────────────────────┐
                     │   GitHub repo         │
                     │  Task_01 (this repo)  │
                     └─────────┬─────────────┘
                               │
                  push to main │
                               ▼
        ┌────────────────────────────────────────────┐
        │                                            │
   ┌────▼─────────┐                          ┌───────▼───────────┐
   │  Netlify     │                          │  HuggingFace      │
   │  webhook on  │                          │  Spaces           │
   │  push        │                          │  (separate        │
   │              │                          │   git remote)     │
   │  Builds      │                          │                   │
   │  frontend/   │                          │  Builds           │
   │  with        │                          │  backend/         │
   │  npm run     │                          │  Dockerfile       │
   │  build       │                          │                   │
   └────┬─────────┘                          └────────┬──────────┘
        │                                             │
        │ Serves at                                   │ Serves at
        ▼                                             ▼
  https://<your-site>.netlify.app             https://<space>.hf.space
        │                                             │
        │  HTTPS  fetch                               │
        └───────────────────────▶ /login, /chat ◀─────┘
                                  /signup, etc.
                                             │
                                             ▼
                              ┌──────────────────────────┐
                              │   api.groq.com           │
                              │   (Groq managed LLM)     │
                              └──────────────────────────┘
```

**Frontend env on Netlify:**
- `NEXT_PUBLIC_API_URL` = your HF Space URL (e.g., `https://sandytech-neurocopilot-backend.hf.space`)

**Backend secrets on HuggingFace Spaces:**
- `GROQ_API_KEY` = your Groq API key
- `CORS_ORIGINS` = your Netlify URL (e.g., `https://neuro-copilot.netlify.app,http://localhost:3000`)

---

## 7. Local Development

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env
# Edit .env: set GROQ_API_KEY=<your key>
pip install -r requirements.txt
uvicorn main:app --port 8000

# Terminal 2 — frontend
cd frontend
cp .env.example .env.local
# .env.local already points NEXT_PUBLIC_API_URL to localhost:8000
npm install
npm run dev
```

Visit `http://localhost:3000` → signup → log in → chat with Groq-powered answers.

---

## 8. Known Limitations (v1)

| Limitation | Why | Tracked in |
|------------|-----|-----------|
| Passwords use SHA-256 without salt | Legacy from v0 prototype; bcrypt slated for v2 | Future Plans |
| User store is a JSON file | Simple, works for free tier; SQLite/Postgres in v2 | Future Plans |
| `/chat` and `/suggestions` are unauthenticated | v0 behavior preserved; JWT planned in v2 | Future Plans |
| No rate limiting | Open to brute-force on `/login` and abuse on `/chat` | Future Plans |
| FAISS index rebuilt on every restart | Fast at 55 entries; persistence becomes worthwhile if dataset grows | Future Plans |
| Groq free-tier rate limit (30 RPM) | Acceptable for demo; backend returns friendly fallback if hit | Risk noted in spec |

---

## 9. Workflow Summary

| Workflow | Latency | External calls | Failure modes |
|----------|---------|----------------|---------------|
| Page load (root → login) | <100 ms | None | n/a |
| Signup | ~50 ms | None | Duplicate email, weak password |
| Login | ~50 ms | None | Wrong credentials |
| Chat (in-scope question) | ~1.5 s | 1× Groq | Groq timeout/error → verbatim fallback |
| Chat (out-of-scope question) | ~50 ms | None (Groq skipped) | n/a |
| Suggestions | ~20 ms | None | n/a |
| Backend cold start (HF Spaces) | ~30 s | HF model download (cached after first run) | n/a |

---

## 10. Further Reading

- **[Project Overview](project-overview.md)** — features, status, quickstart
- **[Project Spec](superpowers/specs/NeuroCopilot-plan.md)** — original requirements, design decisions, v2 vision
- **[Implementation Plan](superpowers/plans/implementation-plan.md)** — full v1+v2 build roadmap with phased tasks
- **[Implementation Steps](superpowers/plans/implementation-steps.md)** — minimal Groq integration steps that landed in v1
