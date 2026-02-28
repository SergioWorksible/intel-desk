"""
ML clustering microservice configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    # Supports new keys (sb_secret_...) and legacy (service_role)
    SUPABASE_SERVICE_KEY = (
        os.getenv("SUPABASE_SECRET_KEY") or  # Nueva clave (recomendada)
        os.getenv("SUPABASE_SERVICE_ROLE_KEY") or  # Legacy
        os.getenv("SUPABASE_SERVICE_KEY")  # Fallback
    )
    DATABASE_URL = os.getenv("DATABASE_URL")

    # Flask
    PORT = int(os.getenv("PORT", 5001))
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"

    # ML Config
    # Multilingual model that works well with Spanish, English, etc.
    EMBEDDING_MODEL = os.getenv(
        "EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2"
    )
    
    # HDBSCAN params
    MIN_CLUSTER_SIZE = int(os.getenv("MIN_CLUSTER_SIZE", 2))
    MIN_SAMPLES = int(os.getenv("MIN_SAMPLES", 1))
    
    # Similarity threshold for assigning to existing clusters
    SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", 0.75))
    
    # Deduplication - threshold for considering articles as duplicates
    DEDUP_THRESHOLD = float(os.getenv("DEDUP_THRESHOLD", 0.92))
    
    # Embedding dimension (depends on model)
    EMBEDDING_DIM = 384  # for MiniLM

    @classmethod
    def validate(cls):
        """Validates that required configurations are present"""
        if not cls.SUPABASE_URL:
            raise ValueError("SUPABASE_URL not configured")
        
        if not cls.SUPABASE_SERVICE_KEY:
            raise ValueError(
                "Missing Supabase service key. Configure one of:\n"
                "  - SUPABASE_SECRET_KEY (new, recommended)\n"
                "  - SUPABASE_SERVICE_ROLE_KEY (legacy)\n"
                "  - SUPABASE_SERVICE_KEY (fallback)\n\n"
                "Get the key from: Supabase Dashboard > Settings > API > Service Role Key"
            )
