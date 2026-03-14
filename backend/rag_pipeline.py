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
        Get response for a query using semantic search.
        
        Args:
            query: User's question
            k: Number of top results to consider
            
        Returns:
            Tuple of (response, similarity_score)
        """
        if not self.vector_store:
            return "Sorry, I couldn't find an answer for that.", 0.0
        
        # Perform similarity search
        results = self.vector_store.similarity_search_with_score(query, k=k)
        
        if not results:
            return "Sorry, I couldn't find an answer for that.", 0.0
        
        # Get the most similar result
        best_doc, best_score = results[0]
        
        # Convert distance to similarity score (FAISS uses L2 distance)
        # Lower distance = higher similarity
        # We'll use a simple conversion: similarity = 1 / (1 + distance)
        similarity = 1 / (1 + best_score)
        
        # Check if similarity meets threshold
        if similarity < self.similarity_threshold:
            return "Sorry, I couldn't find an answer for that.", similarity
        
        # Return the answer from metadata
        answer = best_doc.metadata.get('answer', "Sorry, I couldn't find an answer for that.")
        
        return answer, similarity
    
    def get_suggested_questions(self, n: int = 15) -> List[str]:
        """
        Get a list of suggested questions from the dataset.
        
        Args:
            n: Number of questions to return
            
        Returns:
            List of question strings
        """
        questions = [item['question'] for item in self.qa_pairs[:n]]
        return questions


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
        # Get the path to the data file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(current_dir)
        data_path = os.path.join(parent_dir, 'data', 'qa_dataset.json')
        
        _rag_pipeline = RAGPipeline(data_path=data_path, similarity_threshold=0.3)
    
    return _rag_pipeline
