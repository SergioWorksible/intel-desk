"""
Embedding service using Sentence Transformers
"""
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Generates semantic embeddings using multilingual models.
    
    Recommended models:
    - paraphrase-multilingual-MiniLM-L12-v2: Fast, 384 dims, multilingual
    - multilingual-e5-large: More accurate but slower, 1024 dims
    - all-MiniLM-L6-v2: English only but very fast
    """
    
    _instance: Optional['EmbeddingService'] = None
    _model: Optional[SentenceTransformer] = None
    
    def __new__(cls, model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
        """Singleton pattern to avoid loading the model multiple times"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
        if self._model is None:
            logger.info(f"Loading embedding model: {model_name}")
            self._model = SentenceTransformer(model_name)
            self._model_name = model_name
            logger.info(f"Model loaded. Dimension: {self.embedding_dim}")
    
    @property
    def embedding_dim(self) -> int:
        """Embedding dimension of the model"""
        return self._model.get_sentence_embedding_dimension()
    
    def encode(self, texts: List[str], show_progress: bool = False) -> np.ndarray:
        """
        Generate embeddings for a list of texts.
        
        Args:
            texts: List of texts to encode
            show_progress: Show progress bar
            
        Returns:
            np.ndarray of shape (len(texts), embedding_dim)
        """
        if not texts:
            return np.array([])
        
        embeddings = self._model.encode(
            texts,
            show_progress_bar=show_progress,
            convert_to_numpy=True,
            normalize_embeddings=True  # Normalize for cosine similarity
        )
        
        return embeddings
    
    def encode_single(self, text: str) -> np.ndarray:
        """Generate embedding for a single text"""
        return self.encode([text])[0]
    
    def cosine_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two embeddings.
        Since embeddings are normalized, it's simply the dot product.
        """
        return float(np.dot(embedding1, embedding2))
    
    def batch_cosine_similarity(
        self, 
        query_embedding: np.ndarray, 
        embeddings: np.ndarray
    ) -> np.ndarray:
        """
        Calcula similitud coseno de un embedding contra muchos.
        
        Args:
            query_embedding: Embedding de query (1D array)
            embeddings: Matrix de embeddings (2D array)
            
        Returns:
            Array de similitudes
        """
        return np.dot(embeddings, query_embedding)
    
    def prepare_article_text(
        self, 
        title: str, 
        snippet: Optional[str] = None,
        content: Optional[str] = None,
        countries: Optional[List[str]] = None,
        topics: Optional[List[str]] = None
    ) -> str:
        """
        Prepara el texto de un artículo para generar embedding.
        Combina título, snippet y metadata de forma óptima.
        """
        parts = [title]
        
        if snippet:
            parts.append(snippet[:500])  # Limitar snippet
        
        if content:
            # Tomar primeros 1000 caracteres del contenido
            parts.append(content[:1000])
        
        if countries:
            parts.append(f"Países: {', '.join(countries)}")
        
        if topics:
            parts.append(f"Temas: {', '.join(topics)}")
        
        return " | ".join(parts)


# Instancia global del servicio
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service(model_name: str = "paraphrase-multilingual-MiniLM-L12-v2") -> EmbeddingService:
    """Obtiene la instancia global del servicio de embeddings"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService(model_name)
    return _embedding_service
