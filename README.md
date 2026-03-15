# NEURO COPILOT - Complete Project Explanation

This is a **RAG-powered AI chat application** built for the NeuroStack Generative AI Internship Hackathon. Let me explain each file and its purpose:

---

## 🏗️ **Project Structure Overview**

```
Task_01/
├── backend/          # FastAPI backend
├── frontend/         # Next.js frontend
├── data/            # Q&A dataset
└── rag/             # RAG pipeline configuration
```

---

## 📁 **BACKEND FILES** (`backend/`)

### 1. **`main.py`** - FastAPI Application Server
**Purpose:** Main backend server that handles all API requests

**Key Components:**
- **API Endpoints:**
  - `POST /chat` - Processes user questions through RAG pipeline
  - `POST /login` - User authentication
  - `POST /signup` - User registration
  - `GET /suggestions` - Returns suggested questions (20 questions)
  - `GET /health` - Health check endpoint

**How it works:**
```python
@app.get("/suggestions")
async def get_suggestions(n: int = 20):
    """Returns suggested questions from RAG pipeline"""
    rag = get_rag_pipeline()
    questions = rag.get_suggested_questions(n)
    return {"questions": questions}
```

**Why used:** Provides RESTful API for frontend-backend communication, handles authentication, and serves AI responses.

---

### 2. **`auth.py`** - Authentication Module
**Purpose:** Handles user authentication with JSON file persistence

**Key Features:**
- **Password hashing** using SHA-256
- **User storage** in `users_db.json` (persistent across restarts)
- **Login/Signup validation**

**How it works:**
```python
def load_users():
    """Loads users from JSON file for persistence"""
    if os.path.exists(USERS_DB_PATH):
        with open(USERS_DB_PATH, 'r') as f:
            return json.load(f)
    return {}
```

**Why used:** Secure user management with persistent storage so users don't need to re-signup on every session.

---

### 3. **`rag_pipeline.py`** - RAG (Retrieval-Augmented Generation) Engine
**Purpose:** Core AI engine that processes questions and generates answers

**Key Components:**
- **FAISS vector store** - For fast semantic search
- **HuggingFace embeddings** - Converts text to vectors
- **LangChain** - AI orchestration framework

**How it works:**
1. Loads Q&A data from `qa_dataset.json`
2. Creates vector embeddings using HuggingFace
3. Builds FAISS index for similarity search
4. When asked a question:
   - Converts question to vector
   - Finds most similar content in knowledge base
   - Returns relevant answer

**Special feature:** Filters out greetings ("hi", "hello", "hey") from suggestions

**Why used:** Enables accurate, context-aware AI responses based on documentation rather than making up answers.

---

### 4. **`users_db.json`** - User Database
**Purpose:** Persistent storage for registered users

**Structure:**
```json
{
  "user@example.com": {
    "name": "John",
    "email": "user@example.com",
    "password": "hashed_password"
  }
}
```

**Why used:** Maintains user accounts across server restarts.

---

## 📁 **FRONTEND FILES** (`frontend/`)

### 5. **`src/app/globals.css`** - Global Stylesheet
**Purpose:** Centralized CSS styling for the entire application

**Key Sections:**
- **Navbar styles** (`.home-navbar`, `.navbar-logo-text`)
- **Menu drawer** (`.menu-drawer`, `.menu-drawer-item`)
- **Hero section** (`.hero-section`, `.hero-title`)
- **Feature cards** (`.feature-card`)
- **Chat components** (`.chat-input`, `.chat-send-btn`)
- **Suggested questions** (`.suggested-sidebar`, `.suggested-item`)
- **Animations** (`@keyframes jump`, `@keyframes slideFromBottom`)

**Design principles:**
- Monospace fonts throughout (15px)
- Green gradient theme (#22c55e → #059669)
- Glass morphism effects
- Dark/light theme support
- Responsive design

**Why used:** Consistent styling across all pages with theme awareness and reduced Tailwind dependency.

---

### 6. **`src/app/home/page.tsx`** - Home Page
**Purpose:** Landing page showcasing platform features

**Key Components:**
- **Hero section** - Welcome message with typing animation
- **Feature cards** - Smart Q&A, RAG Technology, Lightning Fast
- **About section** - Platform description
- **Navigation** - CSS-only navbar with menu drawer
- **Scroll indicator** - Animated "Scroll to explore" with jump effect

**Special features:**
- **Scroll-triggered animations** using Intersection Observer
- **Dark/light theme toggle**
- **Responsive design** (mobile-friendly)

**Why used:** First impression page that explains the platform and guides users to the chatbot.

---

### 7. **`src/app/chat/page.tsx`** - Chat Interface
**Purpose:** Main AI conversation interface

**Key Components:**
- **Message container** - Displays chat history (30px height, monospace font)
- **Input field** - User message input (`.chat-input`)
- **Send button** - Gradient green button with glow effect (`.chat-send-btn`)
- **Suggested questions sidebar** - 20 clickable questions (dynamic height, 3px gap)
- **Menu drawer** - Theme toggle, logout, navigation

**Styling details:**
- Messages: 3px padding, 15px monospace font
- Send button: 40px height, neon glow on hover
- Suggested questions: min-height 30px, auto-expand based on text length

**Why used:** Core user interaction point where users ask questions and get AI-powered answers.

---

### 8. **`src/app/login/page.tsx`** - Login/Signup Page
**Purpose:** User authentication interface

**Key Features:**
- **Dual-mode form** - Toggle between login and signup
- **Typing animation** - "Join us today" text effect
- **Glass morphism card** - Frosted glass effect
- **Green gradient buttons** - Consistent branding

**How it works:**
1. User enters credentials
2. Sends POST request to `/login` or `/signup`
3. Stores user data in localStorage on success
4. Redirects to home page

**Why used:** Secure entry point with persistent authentication.

---

## 📁 **DATA FILES** (`data/`)

### 9. **`qa_dataset.json`** - Knowledge Base
**Purpose:** Contains 40+ Q&A pairs for the AI to learn from

**Content categories:**
- Greetings (filtered out)
- Platform information ("What is this platform?")
- Technical details ("What is RAG?", "What is FAISS?")
- Usage instructions ("How do I get started?")
- Security ("Is my data secure?")
- Integration ("Can I integrate this with my app?")

**Structure:**
```json
[
  {
    "question": "What is RAG?",
    "answer": "RAG stands for Retrieval-Augmented Generation..."
  }
]
```

**Why used:** Training data for the RAG pipeline - the AI searches this dataset to find relevant answers.

---

## 🔧 **TECHNOLOGY STACK**

### Backend:
- **FastAPI** - Modern Python web framework
- **LangChain** - AI orchestration
- **FAISS** - Vector similarity search (Facebook AI)
- **HuggingFace** - Text embeddings (all-MiniLM-L6-v2)
- **NumPy** - Numerical computations

### Frontend:
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS (minimal usage now)
- **Custom CSS** - Primary styling approach

### AI/ML:
- **Sentence Transformers** - Semantic understanding
- **Vector embeddings** - Text-to-number conversion
- **Similarity search** - Finding relevant content

---

## 🎯 **HOW IT ALL WORKS TOGETHER**

### User Flow:
1. **Visit homepage** → Sees hero section with typing animation
2. **Clicks "Open Chatbot"** → Goes to login/signup
3. **Creates account** → Credentials stored in `users_db.json`
4. **Enters chat** → Can ask questions or click suggested ones
5. **AI processes** → Question → Embedding → FAISS search → Answer
6. **Gets response** → Typed out character-by-character

### Data Flow:
```
User Question
    ↓
Frontend (chat/page.tsx)
    ↓
Backend API (/chat endpoint)
    ↓
RAG Pipeline (rag_pipeline.py)
    ↓
Question → Embedding → FAISS Search
    ↓
Find similar Q&A in qa_dataset.json
    ↓
Return answer
    ↓
Display in chat interface
```

---

## 🎨 **DESIGN DECISIONS**

1. **Monospace fonts** - Consistent, technical look (15px everywhere)
2. **Green gradient** - Brand identity (#22c55e → #059669)
3. **Glass morphism** - Modern, premium feel
4. **Dark theme default** - Developer-friendly aesthetic
5. **CSS-only approach** - Better performance, easier maintenance
6. **Persistent auth** - Better UX (no re-login on refresh)
7. **Greeting filtering** - More useful suggestions
8. **Dynamic heights** - Better content display

---

## 🚀 **KEY FEATURES**

✅ Real-time AI chat with RAG technology  
✅ 20 suggested questions (dynamic, expandable)  
✅ Dark/light theme toggle  
✅ Responsive design (mobile-friendly)  
✅ Secure authentication with password hashing  
✅ Persistent user storage  
✅ Smooth animations and transitions  
✅ Glow effects on hover  
✅ Scroll-triggered animations  
✅ Typing effect for AI responses  

---

This project demonstrates a complete full-stack AI application with modern UI/UX, secure authentication, and intelligent RAG-powered responses!