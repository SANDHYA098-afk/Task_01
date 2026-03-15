from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import UserSignup, UserLogin, UserResponse, ChatRequest, ChatResponse
from auth import signup_user, login_user
from rag_pipeline import get_rag_pipeline
from contextlib import asynccontextmanager
from typing import List

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize RAG pipeline
    print("Initializing RAG pipeline...")
    try:
        rag = get_rag_pipeline()
        print("RAG pipeline initialized successfully!")
    except Exception as e:
        print(f"Warning: Could not initialize RAG pipeline: {e}")
        print("Chat will return placeholder responses.")
    
    yield
    
    # Shutdown: Cleanup if needed
    print("Shutting down...")

app = FastAPI(title="SaaS Support Copilot API", lifespan=lifespan)

# Configure CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "SaaS Support Copilot API is running"}

@app.post("/signup", response_model=UserResponse)
async def signup(user: UserSignup):
    """Register a new user"""
    return signup_user(user)

@app.post("/login", response_model=UserResponse)
async def login(user: UserLogin):
    """Authenticate user"""
    return login_user(user)

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint using RAG pipeline"""
    try:
        rag = get_rag_pipeline()
        response, similarity = rag.get_response(request.message)
        
        return ChatResponse(
            response=response,
            success=True,
            confidence=round(similarity * 100, 1)
        )
    except Exception as e:
        # Fallback response if RAG fails
        return ChatResponse(
            response="Sorry, I could not find an answer for that. Please ask questions related to our platform.",
            success=False,
            confidence=0.0
        )

@app.get("/suggestions")
async def get_suggestions(n: int = 20):
    """Get suggested questions"""
    try:
        rag = get_rag_pipeline()
        questions = rag.get_suggested_questions(n)
        return {"questions": questions}
    except Exception:
        # Fallback suggestions
        return {
            "questions": [
                "What is this platform?",
                "How does the AI assistant work?",
                "What is RAG?",
                "How do I get started?",
                "What features are available?",
                "Is my data secure?",
                "What technologies power this system?",
                "How accurate are the responses?",
                "Can I integrate this with my app?",
                "What is LangChain?",
                "How does the chatbot work?",
                "What is FAISS?",
                "How do I contact support?",
                "What are the system requirements?",
                "Is there a free tier?"
            ]
        }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
