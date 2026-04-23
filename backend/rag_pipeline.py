import json
import os
from typing import List, Tuple
import numpy as np
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import CharacterTextSplitter
from langchain_core.documents import Document

class RAGPipeline:
    def __init__(self, data_path: str = None, similarity_threshold: float = 0.5):
        """
        Initialize the RAG pipeline with FAISS vector store and HuggingFace embeddings.
        
        Args:
            data_path: Path to the Q&A dataset JSON file
            similarity_threshold: Minimum similarity score for valid responses
        """
        self.similarity_threshold = similarity_threshold
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        self.vector_store = None
        self.qa_pairs = []  # Store original Q&A pairs for retrieval
        
        if data_path and os.path.exists(data_path):
            self.load_and_index_data(data_path)
    
    def load_and_index_data(self, data_path: str) -> None:
        """
        Load Q&A data from JSON file and create FAISS index.
        
        Args:
            data_path: Path to the JSON file containing Q&A pairs
        """
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        self.qa_pairs = data
        
        # Create documents from Q&A pairs
        documents = []
        for item in data:
            # Create a document combining question and answer for better semantic search
            content = f"Question: {item['question']}\nAnswer: {item['answer']}"
            doc = Document(
                page_content=content,
                metadata={
                    'question': item['question'],
                    'answer': item['answer']
                }
            )
            documents.append(doc)
        
        # Create text splitter for chunking (optional, as our documents are already small)
        text_splitter = CharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=0,
            separator="\n"
        )
        
        # Split documents if needed
        split_docs = text_splitter.split_documents(documents)
        
        # Create FAISS vector store
        self.vector_store = FAISS.from_documents(
            split_docs,
            self.embeddings
        )
        
        print(f"Indexed {len(self.qa_pairs)} Q&A pairs into FAISS vector store")
    
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
        # Convert L2 distance to cosine similarity for normalized embeddings
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
    
    def get_suggested_questions(self, n: int = 20) -> List[str]:
        """
        Get a list of suggested questions from the dataset.
        
        Args:
            n: Number of questions to return
            
        Returns:
            List of question strings
        """
        # Filter out greeting questions
        greetings = {'hi', 'hello', 'hey'}
        questions = [item['question'] for item in self.qa_pairs 
                     if item['question'].lower().strip() not in greetings]
        return questions[:n]


# Global RAG pipeline instance
_rag_pipeline = None

def get_rag_pipeline() -> RAGPipeline:
    """
    Get or create the global RAG pipeline instance.
    
    Returns:
        RAGPipeline instance
    """
    global _rag_pipeline
    
    if _rag_pipeline is None:
        # Try multiple potential paths for the data file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(current_dir)
        
        possible_paths = [
            os.path.join(parent_dir, 'data', 'qa_dataset.json'),
            os.path.join(current_dir, 'data', 'qa_dataset.json'),
            os.path.join(current_dir, '..', 'data', 'qa_dataset.json'),
            'data/qa_dataset.json',
            '/app/data/qa_dataset.json'
        ]
        
        data_path = possible_paths[0]
        for path in possible_paths:
            if os.path.exists(path):
                data_path = path
                break
        
        _rag_pipeline = RAGPipeline(data_path=data_path, similarity_threshold=0.25)
    
    return _rag_pipeline
