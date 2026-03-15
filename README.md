# ⚡ NEURO COPILOT — AI Support Assistant

**NEURO COPILOT** is a high-performance, RAG-driven AI Support Copilot designed to provide instant, contextually relevant answers using private knowledge bases. It features a stunning **Glassmorphism UI**, real-time **Confidence Scoring**, and a technical monospace aesthetic inspired by high-end developer tools.

---

## 🎨 Visual Identity
- **Glassmorphism**: Leverages `backdrop-filter: blur(20px)` and semi-transparent layers for a premium, futuristic look.
- **Neon Green Theme**: Built around a vibrant `#22c55e` green gradient accent system.
- **Typography**: Uses `Geist Mono` for a precise, engineering-focused feel across all interfaces.
- **Interactive States**: Pulse glows, floating animations, and typing-cursor effects for bot responses.

## 🧠 Core Features

### 1. Advanced RAG Pipeline
- **Engine**: Powered by **LangChain** and **FAISS**.
- **Embeddings**: Uses `all-MiniLM-L6-v2` (HuggingFace) for 384-dimensional semantic understanding.
- **Accuracy**: Employs a cosine similarity-based confidence metric `1 - (L2² / 2)` to ensure exact knowledge-base matches score near 100%.

### 2. High-Performance Chat Interface
- **Suggested Questions**: A curated list of questions fetched directly from the RAG dataset, providing a 100% confidence match.
- **Confidence Badges**: Real-time reliability scoring displayed for every bot response (rounded to 1 decimal place).
- **Typing Animation**: Bots deliver responses character-by-character to simulate interactive communication.
- **Scrollable Sidebar**: A fixed-height, scrollable suggestions panel for easy navigation of common queries.

### 3. Integrated Authentication
- **Dual Mode Form**: Seamless, animated transition between Login and Signup.
- **Security**: Mandatory password complexity (8+ characters, 1 uppercase, 1 number).
- **Session Persistence**: Automatic redirection to Chat after login, with user data stored in LocalStorage.
- **Theme Toggle**: Persistence-based Dark/Light mode switcher available globally.

---

## 📂 Architecture Overview

```text
Task_01/
├── backend/            # FastAPI + LangChain Implementation
│   ├── main.py         # Entry point & API routes (/chat, /suggestions, /auth)
│   ├── rag_pipeline.py # FAISS Vector Database & Similarity Logic
│   ├── auth.py         # JWT-compatible auth logic
│   └── models.py       # Pydantic Schemas
├── data/               # Knowledge Base
│   └── qa_dataset.json # Source of truth for AI responses
├── frontend/           # Next.js 16 + Tailwind CSS v4
│   ├── app/            # App Router (Chat, Login)
│   └── globals.css     # Design tokens & Custom Animations
└── README.md           # Documentation
```

---

## 🛠️ How it Works: Project Explanation

### 1. The RAG Pipeline (The "Brain")
When you ask a question, NEURO COPILOT doesn't just guess. It uses a **Retrieval-Augmented Generation (RAG)** approach:
- **Embedding**: Your question is converted into a 384-dimensional vector using the `all-MiniLM-L6-v2` transformer model. This captures the *meaning* of your words, not just the keywords.
- **Search**: This vector is compared against a pre-indexed **FAISS** (Facebook AI Similarity Search) database of our knowledge base (`qa_dataset.json`).
- **Retrieval**: The system finds the most semantically similar entry. If it's a strong match, it returns the stored answer. If not, it triggers a fallback.

### 2. The Confidence Engine
Every answer comes with a **Confidence Score**. We calculate this using **Cosine Similarity**:
- We take the L2 distance from FAISS and convert it: `Score = 1 - (Distance² / 2)`.
- **Exact Matches**: Questions from the "Suggested Questions" list typically score **95% - 100%**.
- **The Threshold**: If a score falls below **25%**, the AI determines it doesn't have a reliable answer and provides a polite fallback message to prevent "hallucinations."

### 3. The Design Philosophy
The UI is built with a **Glassmorphism** aesthetic. This means:
- **Frosted Glass**: Using `backdrop-filter: blur()`, cards appear as semi-transparent layers over the background.
- **Depth**: Subtle borders and soft shadows create a sense of hierarchy and 3D space.
- **Monospace Focus**: By using `Geist Mono` as the primary font, we give the app a technical, "command-center" feel that aligns with AI and engineering tools.

### 4. Direct Navigation Flow
To ensure the fastest possible user experience, we removed traditional landing pages. Once authenticated, users are dropped directly into the **Command Center (Chat)**. This minimizes friction and puts the core tool front and center.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### Setup

1. **Clone & Install Dependencies**
   ```bash
   git clone <repository-url>
   cd Task_01
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🛠️ Deployment Notes
- The application uses `localhost:8000` as the default API endpoint.
- For production, update the API URL in `frontend/app/login/page.tsx` and `frontend/app/chat/page.tsx`.

---
*Built for the NeuroStack GenAI Hackathon.*
