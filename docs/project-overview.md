# NeuroCopilot — Project Overview

## What is NeuroCopilot?

**NeuroCopilot** is an AI-powered support assistant that answers user questions instantly by combining a curated knowledge base with a hosted large language model. Users sign up, log in, and ask natural-language questions through a polished chat interface — the system retrieves the most relevant content from its knowledge base and uses Groq's Llama 3.3 70B to generate accurate, conversational answers grounded in that content.

The product is built as a full-stack web application with a Next.js frontend and a FastAPI backend, deployed as a free-tier SaaS on Netlify and HuggingFace Spaces.

---

## Core Features

### 🔐 User Accounts
- Email + password signup with strength validation (8+ chars, uppercase, digit)
- Email + password login
- Session persistence across page reloads

### 💬 AI Chat
- Natural-language question answering powered by **Groq Llama 3.3 70B**
- **RAG (Retrieval-Augmented Generation)** — answers grounded in a curated knowledge base, never hallucinated
- **Confidence scoring** — every reply includes a similarity score so users can gauge relevance
- **Graceful fallbacks** — out-of-scope questions return a clear "I don't have that information" instead of guessing
- **Sub-second responses** — Groq's hardware-accelerated inference returns answers in ~1 second

### 💡 Suggested Questions
- Sidebar of curated questions sampled from the knowledge base
- One-click to send — great for first-time users exploring what the assistant can do

### ✨ Polished UX
- Glassmorphism design with floating background orbs and neon-green accents
- Dark/light theme toggle (persisted in `localStorage`)
- Typing animation on bot replies (18 ms per character) for a "live response" feel
- Smooth auto-scroll, responsive layout, keyboard-friendly inputs

### 🛡 Resilient Backend
- Graceful Groq error handling — if the LLM times out or rate-limits, falls back to the dataset's verbatim answer
- Confidence threshold short-circuits Groq calls for clearly out-of-scope questions, saving API budget
- CORS properly configured for cross-origin browser requests
- Health-check endpoint for deployment platform monitoring

---

## How It Works (User Perspective)

```
1. Visit the site
        ↓
2. Create an account (email + name + password)
        ↓
3. Log in
        ↓
4. See chat interface with suggested questions on the left
        ↓
5. Click a suggestion OR type your own question
        ↓
6. NeuroCopilot retrieves relevant knowledge → asks Groq → returns answer
        ↓
7. Read the answer with its confidence badge; ask follow-ups
```

A typical interaction takes **~1.5 seconds end-to-end** (Groq inference + retrieval + network).

---

## Tech Stack at a Glance

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS v4 |
| **Backend** | FastAPI · Uvicorn · Python 3.10 |
| **LLM** | Groq API · Llama 3.3 70B (`llama-3.3-70b-versatile`) |
| **Vector search** | FAISS (CPU) |
| **Embeddings** | sentence-transformers · `all-MiniLM-L6-v2` (384-dim) |
| **Auth** | Email + password · SHA-256 hashing · JSON file storage |
| **Frontend hosting** | Netlify (free tier) |
| **Backend hosting** | HuggingFace Spaces (free tier, Docker SDK) |
| **LLM provider** | Groq free tier (30 RPM) |

---

## Project Status

**v1 — Live.** Features above are deployed and demoable end-to-end.

**Coming next** (see [docs/superpowers/plans/implementation-plan.md](superpowers/plans/implementation-plan.md) → "Future Plans"):

- 🔒 **Production-grade auth** — JWT + bcrypt + SQLite + email verification + password reset
- 🚦 **Rate limiting** to protect the Groq free-tier budget
- 💾 **Conversation history** — new-chat-session button, persistent threads, chat list sidebar
- 📧 **Real email provider** for verification + reset flows
- 📊 **Observability** — structured logs, request tracing, Groq call metrics
- 🧠 **Fine-tuned model option** — small domain-trained model toggleable in the chat UI

---

## Quick Start

For local development setup, deployment instructions, and detailed configuration, see:

- **[Architecture & Workflow](architecture.md)** — system design, data flow, deployment topology
- **[Implementation Plan](superpowers/plans/implementation-plan.md)** — full v1 + v2 build roadmap
- **[Implementation Steps](superpowers/plans/implementation-steps.md)** — minimal Groq integration steps that landed in v1
- **[Project Spec](superpowers/specs/NeuroCopilot-plan.md)** — original requirements and design decisions
