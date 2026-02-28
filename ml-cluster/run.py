#!/usr/bin/env python3
"""
Startup script for the ML clustering service
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, get_services
from config import Config

if __name__ == "__main__":
    print("=" * 60)
    print("ML Cluster Service - Geopolitic Intel Desk")
    print("=" * 60)
    
    # Validate configuration
    try:
        Config.validate()
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        print("\nMake sure to create a .env file with the following variables:")
        print("  SUPABASE_URL=https://tu-proyecto.supabase.co")
        print("  SUPABASE_SECRET_KEY=sb_secret_tu-secret-key  (o SUPABASE_SERVICE_ROLE_KEY)")
        print("  DATABASE_URL=postgresql://postgres:password@db.tu-proyecto.supabase.co:5432/postgres")
        print("\nGet the keys from: Supabase Dashboard > Settings > API")
        sys.exit(1)
    
    print(f"✓ Supabase URL: {Config.SUPABASE_URL[:30]}...")
    print(f"✓ Embedding model: {Config.EMBEDDING_MODEL}")
    print(f"✓ Min cluster size: {Config.MIN_CLUSTER_SIZE}")
    print(f"✓ Similarity threshold: {Config.SIMILARITY_THRESHOLD}")
    print(f"✓ Dedup threshold: {Config.DEDUP_THRESHOLD}")
    print()
    
    # Pre-load model (may take a few seconds the first time)
    print("Loading embedding model (may take a few seconds)...")
    get_services()
    
    print()
    print(f"🚀 Server started at http://localhost:{Config.PORT}")
    print("   Available endpoints:")
    print("   - GET  /health         - Health check")
    print("   - POST /api/cluster    - Run clustering")
    print("   - POST /api/embed      - Generate embeddings")
    print("   - POST /api/similarity - Calculate similarity")
    print("   - POST /api/deduplicate - Detect duplicates")
    print("   - POST /api/find-cluster - Find cluster for article")
    print()
    print("Press Ctrl+C to stop")
    print("=" * 60)
    
    app.run(
        host="0.0.0.0",
        port=Config.PORT,
        debug=Config.DEBUG
    )
