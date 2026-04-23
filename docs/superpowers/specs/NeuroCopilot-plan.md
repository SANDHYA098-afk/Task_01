# NeuroCopilot — Project Plan

**Date:** 2026-04-23
**Status:** Planning (pre-implementation)
**Owner:** @SANDHYA098-afk

---

## 1. Overview

**NeuroCopilot** is an AI-powered support assistant that answers user questions using a curated knowledge base. It combines semantic retrieval (FAISS vector search) with a hosted large language model (Groq Llama 3.3 70B) to produce accurate, natural-sounding answers grounded in domain-specific content.

It ships as a full-stack web application: a Next.js frontend, a FastAPI backend with email/password authentication and persistent storage, and a RAG pipeline that calls Groq for generation.

---

## 2. Goals

| Goal | How it's achieved |
|------|-------------------|
| Accurate, natural answers | RAG pipeline: FAISS retrieval + Groq Llama 3.3 70B generation |
| Production-grade authentication | JWT + bcrypt + SQLite + email verification + password recovery |
| Free-tier compatible | Groq free tier (30 RPM), HuggingFace Spaces, Netlify, SQLite |
| Polished UX | Glassmorphism Next.js UI, typing animations, confidence indicators |

---

## 3. Scope (v1)

- User accounts with email + password
- Email verification flow (stubbed email delivery)
- Password reset flow (stubbed email delivery)
- JWT-based session via httpOnly cookies
- SQLite user + token storage
- RAG chat endpoint backed by FAISS + Groq
- Suggested-questions endpoint
- Next.js frontend covering: signup, login, verify-email, forgot-password, reset-password, chat
- Environment-variable-driven configuration (no hardcoded URLs or secrets)
- Containerized backend deployable to HuggingFace Spaces
- Frontend deployable to Netlify

---

## 4. Architecture

```
┌────────────────────────┐       ┌───────────────────────────┐       ┌──────────────────┐
│   Next.js 16 Frontend  │       │    FastAPI Backend        │       │   Groq API       │
│   (Netlify)            │       │    (HuggingFace Spaces)   │       │  Llama 3.3 70B   │
│                        │       │                           │       │                  │
│  - /signup /login      │ HTTPS │  - JWT middleware         │ HTTPS │                  │
│  - /verify-email       │ ────▶ │  - /auth/* routes         │ ────▶ │                  │
│  - /forgot-password    │       │  - /chat (RAG)            │       │                  │
│  - /reset-password     │ ◀──── │  - /suggestions           │ ◀──── │                  │
│  - /chat               │       │  - EmailService (stub)    │       └──────────────────┘
│                        │       │  - SQLite                 │
│  httpOnly JWT cookie   │       │  - RAG: FAISS + Groq      │       ┌──────────────────┐
│  + NEXT_PUBLIC_API_URL │       │                           │ ────▶ │  FAISS index     │
└────────────────────────┘       └───────────────────────────┘       │  (in-memory,     │
                                                                     │   built at boot  │
                                                                     │   from dataset)  │
                                                                     └──────────────────┘
```

**Component responsibilities:**

- **Auth module** — Owns user lifecycle (signup, verification, login, logout, password reset) and JWT issuance. Depends on the database layer and the email service, nothing else.
- **Email service** — Abstract interface with a console-logging default. Isolated so a real provider (Resend, SendGrid, Brevo) can be dropped in without touching auth logic.
- **RAG pipeline** — Two stages. Stage 1: embed the question and retrieve top-k relevant chunks from FAISS. Stage 2: build a grounded prompt and call Groq for generation. Owns the system prompt and confidence-threshold logic.
- **Chat route** — Thin HTTP handler. Verifies JWT, calls the RAG pipeline, returns the response.
- **Frontend** — Stateless UI over the backend. Stores no user data in client storage; relies on the JWT cookie for session state and `GET /auth/me` for identity.

---

## 5. Tech Stack

### Backend

| Layer | Choice |
|-------|--------|
| Framework | FastAPI 0.115+ |
| Server | Uvicorn |
| Database | SQLite 3 |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Password hashing | `passlib[bcrypt]` |
| JWT | `python-jose` |
| Config | `pydantic-settings` |
| LLM client | `groq` (official SDK) |
| Vector search | FAISS (CPU) |
| Embeddings | `sentence-transformers` `all-MiniLM-L6-v2` |
| Testing | `pytest`, `httpx` |

### Frontend

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| State | React hooks + cookie |
| Fonts | Geist / Geist Mono |

### Deployment

| Target | Platform |
|--------|----------|
| Frontend | Netlify (free tier) |
| Backend | HuggingFace Spaces (free tier, Docker runtime) |
| Database | SQLite file on HF Spaces persistent volume |
| LLM | Groq API (free tier, 30 RPM) |

---

## 6. Component Designs

### 6.1 Authentication

Email + password authentication with bcrypt hashing (cost factor 12), JWT access tokens (HS256, 30-minute expiry, signed with `JWT_SECRET`), and SQLAlchemy-backed SQLite storage. JWT is delivered via an `HttpOnly; Secure; SameSite=None` cookie so the frontend never touches the token directly. CORS uses an explicit origin allowlist with `allow_credentials=True`.

**Database schema (3 tables):**

```sql
users(
  id, email UNIQUE, name, password_hash, is_verified, created_at
)

email_verification_tokens(
  id, user_id FK, token UNIQUE, expires_at, used  -- TTL: 24h
)

password_reset_tokens(
  id, user_id FK, token UNIQUE, expires_at, used  -- TTL: 1h, single-use
)
```

Tokens are generated with `secrets.token_urlsafe(32)`.

**Endpoints (all under `/auth`):**

| Method | Path | Auth |
|--------|------|------|
| POST | `/signup` | Public — creates user, issues verification token, sends email |
| POST | `/login` | Public — only succeeds if `is_verified=TRUE` |
| POST | `/logout` | Public — clears JWT cookie |
| GET | `/me` | JWT — returns current user |
| POST | `/verify-email` | Token-gated |
| POST | `/resend-verification` | Email-gated |
| POST | `/forgot-password` | Public — always returns 200 (prevents enumeration) |
| POST | `/reset-password` | Token-gated |

**Error responses:** `401` opaque on bad credentials, `403` on unverified login, `400` on expired/used tokens.

### 6.2 Email Service (stubbed)

Interface in `backend/services/email.py`:

```python
class EmailService(Protocol):
    def send_verification(self, to: str, token: str) -> None: ...
    def send_password_reset(self, to: str, token: str) -> None: ...
```

Default implementation — `ConsoleEmailService` — prints a clearly-marked block to stdout so the token can be copied during local development:

```
=== EMAIL (stub) ===
To: user@example.com
Subject: Verify your NeuroCopilot account
Link: http://localhost:3000/verify-email?token=abc123...
====================
```

A real provider is added later by implementing the Protocol in a new class (e.g., `ResendEmailService`) and changing one line in the FastAPI dependency wiring. No other call sites change.

### 6.3 RAG Pipeline

**Dataset.** `data/qa_dataset.json` is the knowledge base. Each entry is a `{question, answer}` pair. At v1, the dataset has ~55 curated entries. The file is versioned in git.

**Index construction (startup).** On backend boot:

1. Load `qa_dataset.json`.
2. Embed each Q&A pair's *question* with `all-MiniLM-L6-v2` (384 dims).
3. Build an in-memory FAISS L2 index.

The index is rebuilt on every restart; v1 does not persist the index to disk (dataset is small enough that rebuild is <1 s).

**Query flow.**

```python
# Stage 1 — Retrieval
query_embedding = embed(question)
top_k_chunks = faiss_index.search(query_embedding, k=3)
best_score = convert_l2_to_cosine(top_k_chunks[0].distance)

# Stage 2 — Generation gate
if best_score < 0.25:
    return fallback_response()        # Skip Groq, return canned "I don't know"

# Stage 3 — Generation
prompt = build_prompt(system_prompt, top_k_chunks, question)
answer = groq_client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=prompt,
    temperature=0.3,
    max_tokens=500,
    timeout=15,
)
```

**Similarity conversion.** FAISS returns L2 distances; we convert to cosine similarity via `sim = 1 - (distance² / 2)`, then threshold at 0.25.

**System prompt (initial draft, iterable):**

> You are NeuroCopilot, a helpful support assistant. Answer the user's question using ONLY the context provided below. If the context doesn't contain the answer, say *"I don't have that information — could you rephrase or ask something else?"* Be concise and direct. Do not invent facts. Do not mention the word "context" in your reply.

**Groq error handling.** On timeout, rate-limit, or any exception from the Groq SDK: log the error, return a graceful response body with `source: "error"` and a friendly "service is busy — please try again" message. The user never sees a 500.

**Response contract:**

```json
{
  "answer": "...",
  "confidence": 0.87,   // top FAISS cosine similarity (0–1), not LLM confidence
  "source": "rag"       // "rag" | "fallback" | "error"
}
```

### 6.4 Chat + Suggestions Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/chat` | POST | JWT | Main RAG question-answer endpoint |
| `/suggestions` | GET | JWT | Returns N curated suggested questions from the dataset (filters greetings) |
| `/health` | GET | Public | Liveness check for deployment platforms |

All authenticated endpoints share a single FastAPI dependency that reads the JWT cookie, decodes it, loads the user from the database, and injects the user into the handler. Unauthenticated access returns **401**.

### 6.5 Frontend

The Next.js App Router serves seven routes covering the full auth + chat flow:

| Route | Purpose |
|-------|---------|
| `/` | Redirect to `/login` (no session) or `/chat` (session) |
| `/signup` | Email + name + password; on success shows "check your email" state |
| `/login` | Email + password; links to `/forgot-password` |
| `/verify-email?token=…` | Consumes verification token; success/error state |
| `/forgot-password` | Email input; always shows "if an account exists, check your email" |
| `/reset-password?token=…` | New password input; redirects to login on success |
| `/chat` | Main chat UI: suggested-questions sidebar, typing animation, confidence badge |

**Auth transport.** No `sessionStorage` or `localStorage` for tokens. All `fetch` calls use `credentials: "include"` so the browser handles the JWT cookie automatically. Session state is discovered via `GET /auth/me` on page load.

**Configuration.** All backend URLs come from `process.env.NEXT_PUBLIC_API_URL`; `.env.example` is committed, real `.env.local` is gitignored.

**Visual style.** Glassmorphism design — dark/light theme toggle, neon-green accent, floating background orbs, Geist Mono typography, 18ms-per-character typing animation — applied consistently across all pages.

---

## 7. Configuration

### Backend (`backend/.env`)

```
JWT_SECRET=<32+ random bytes>
GROQ_API_KEY=<from groq.com>
DATABASE_URL=sqlite:///./neuro.db
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,https://<your-netlify-domain>
EMAIL_PROVIDER=console
VERIFICATION_TOKEN_TTL_HOURS=24
RESET_TOKEN_TTL_HOURS=1
JWT_EXPIRY_MINUTES=30
```

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Both `.env.example` files are committed. Real `.env` / `.env.local` files are gitignored.

---

## 8. Testing Strategy

**Backend unit tests** (pytest):
- Password hashing round-trip (hash + verify)
- JWT encode/decode, expiry
- Token generation and TTL arithmetic
- RAG prompt construction (correct system prompt, correct context layout)
- FAISS score conversion (L2 → cosine)

**Backend integration tests** (pytest + httpx):
- Signup → verification token printed → verify → login succeeds → `/me` returns user
- Forgot password → reset token printed → reset → login with new password
- Login with unverified account → 403
- Login with wrong password → 401 with opaque message
- `/chat` with JWT + in-scope question → asserts Groq client called, returns answer (Groq mocked)
- `/chat` with JWT + out-of-scope question → returns fallback, Groq NOT called
- `/chat` without JWT → 401

**Frontend** (manual smoke tests for v1):
- Full signup → verify (via console log) → login → chat flow works end-to-end.
- Forgot → reset (via console log) → login with new password works.
- Chat UX: typing animation renders, confidence badge shows, suggestions clickable.

Automated frontend tests (Playwright / Cypress) are out of scope for v1.

---

## 9. Security Considerations

- **Passwords.** bcrypt with cost factor 12. Tune if deployment CPU is weak.
- **JWT.** 32+ random bytes in `JWT_SECRET`. Never committed. Rotation invalidates all sessions (acceptable at v1 scale).
- **Cookies.** `HttpOnly` + `Secure` + `SameSite=None` across cross-origin deployments.
- **User enumeration.** `/forgot-password` always returns 200; `/login` returns opaque "Invalid email or password" for both wrong email and wrong password.
- **Reset tokens.** Single-use, cryptographically random (`secrets.token_urlsafe(32)`), 1-hour TTL.
- **SQL injection.** SQLAlchemy ORM with parameterized queries only; no raw string SQL anywhere.
- **CORS.** Explicit origin allowlist; no wildcards with credentials.
- **Secrets in repo.** `.env` gitignored; `.env.example` holds placeholder values only.
- **Rate limiting.** Not included in v1 — accepted risk; first item on the future-plans list.

---

## 10. Deployment

**Backend → HuggingFace Spaces:**
- Dockerfile exposes port 7860.
- Env vars set via the HF Spaces "Secrets" UI.
- SQLite file stored in `/data` (HF Spaces persistent volume).
- Startup script runs Alembic migrations before launching Uvicorn.

**Frontend → Netlify:**
- Build: `npm run build`
- Base directory: `frontend/`
- Publish directory: `.next`
- `NEXT_PUBLIC_API_URL` set in Netlify env var config.

**Local dev:**
- `docker-compose up` (optional) or run backend and frontend separately.
- `backend/`: `uvicorn main:app --reload --port 8000`
- `frontend/`: `npm run dev` (port 3000)
- SQLite file auto-created on first boot; Alembic runs migrations.

---

## 11. Risks & Open Questions

| Risk | Mitigation |
|------|------------|
| Groq free-tier rate limit (30 RPM) during heavy demo | Backend returns friendly "service busy" fallback; README calls out the limit |
| HF Spaces cold-start delay on first request | Accepted platform behavior; README notes this |
| Cross-origin cookie setup fails in production | Test with `curl -v` against deployed backend before frontend cutover; README documents the exact CORS + cookie flags |
| Groq deprecates / renames `llama-3.3-70b-versatile` | Model ID isolated to one constant in config; swap is one-line |

**Open question — must resolve before build starts:**

> Does the HuggingFace Spaces free-tier Docker runtime provide persistent filesystem storage across restarts?
>
> If **yes** → SQLite at `/data/neuro.db` as designed.
>
> If **no** → switch `DATABASE_URL` to a free external Postgres (Supabase, Neon, or Turso). Migration is straightforward since we're using SQLAlchemy + Alembic from day one.

The implementation plan should include a verification step as task #1.

---

## 12. Success Criteria (v1 "Done")

- [ ] A new visitor can sign up, find the verification link in the backend console, click it, and log in.
- [ ] An unverified user attempting to log in receives a clear error.
- [ ] A user can request a password reset, find the reset link in the backend console, set a new password, and log in with it.
- [ ] Passwords are bcrypt-hashed in the database (verified by inspecting a row).
- [ ] JWT is delivered via httpOnly cookie; `GET /auth/me` works with it; logout clears it.
- [ ] `POST /chat` returns a Groq-generated answer grounded in retrieved context for in-scope questions.
- [ ] `POST /chat` returns a graceful fallback ("I don't have that information…") for out-of-scope questions, without calling Groq.
- [ ] `GET /suggestions` returns N curated questions filtered from the dataset.
- [ ] Zero hardcoded URLs, secrets, or API keys anywhere in source.
- [ ] README documents architecture, env vars, local-dev setup, and deployment steps.
- [ ] Full signup → verify → login → chat flow demoable end-to-end against deployed HF Spaces + Netlify.

---

## 13. Future Plans (post-v1)

Roughly ordered by expected value vs effort:

1. **Rate limiting** on `/auth/login`, `/auth/forgot-password`, `/chat` — first thing to add post-launch.
2. **Conversation history** — new-chat-session button, persistent `conversations` and `messages` tables, chat list sidebar.
3. **Real email provider** — swap `ConsoleEmailService` for Resend or Brevo (free tier) without touching auth logic.
4. **Refresh tokens** — longer-lived sessions, silent rotation.
5. **OAuth (Google / GitHub)** — sign-in alongside email + password.
6. **Observability** — structured logging, per-request tracing, Groq call metrics, simple dashboard.
7. **Admin panel** — view users, manage dataset, inspect chat logs.
8. **Per-user knowledge bases** — let users upload their own documents; per-user FAISS indices.
9. **Fine-tuned model** — train a small domain model (Phi-3-mini / Gemma 2B) on the Q&A dataset, surfaced via a model toggle in the chat UI.
