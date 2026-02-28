# ML Cluster Service

Geopolitical event clustering microservice using Machine Learning.

## Features

- **Semantic Embeddings**: Uses Sentence Transformers to generate high-quality multilingual embeddings
- **Automatic Clustering**: HDBSCAN to group articles without specifying number of clusters
- **Deduplication**: Detects and removes duplicate or near-duplicate articles
- **pgvector**: Stores embeddings in Supabase for O(log n) fast search
- **REST API**: Simple endpoints to integrate with Next.js

## Requirements

- Python 3.10+
- Supabase with pgvector extension enabled
- ~2GB RAM for the embedding model

## Installation

### 1. Create virtual environment

```bash
cd ml-cluster
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the `ml-cluster` folder:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Supabase Postgres (for pgvector)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Flask
FLASK_ENV=development
FLASK_DEBUG=1
PORT=5001

# ML Config
EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
MIN_CLUSTER_SIZE=2
MIN_SAMPLES=1
SIMILARITY_THRESHOLD=0.75
DEDUP_THRESHOLD=0.92
```

### 4. Run pgvector migration

In Supabase SQL Editor, execute the contents of:
`supabase/migrations/006_pgvector_embeddings.sql`

### 5. Start the service

```bash
python run.py
```

The service will be available at `http://localhost:5001`

## Endpoints

### Health Check
```bash
GET /health
```

### Run Clustering
```bash
POST /api/cluster
Content-Type: application/json

{
  "days": 7,    # Days back to search for articles
  "limit": 500  # Maximum articles to process
}
```

Response:
```json
{
  "message": "Clustering completed",
  "processed": 150,
  "created": 8,
  "updated": 42,
  "duplicates": 5,
  "outliers": 23
}
```

### Generate Embeddings
```bash
POST /api/embed
Content-Type: application/json

{
  "texts": ["Text 1", "Text 2"]
}
```

### Calculate Similarity
```bash
POST /api/similarity
Content-Type: application/json

{
  "text1": "Trump visits China",
  "text2": "US President in Beijing"
}
```

Response:
```json
{
  "similarity": 0.847,
  "is_similar": true
}
```

### Detect Duplicates
```bash
POST /api/deduplicate
Content-Type: application/json

{
  "days": 3,
  "limit": 200
}
```

### Find Cluster for Article
```bash
POST /api/find-cluster
Content-Type: application/json

{
  "title": "Article title",
  "snippet": "Article excerpt...",
  "countries": ["US", "CN"],
  "topics": ["trade", "diplomacy"]
}
```

## Embedding Models

The service uses `paraphrase-multilingual-MiniLM-L12-v2` by default:
- 384 dimensions
- Multilingual (50+ languages including Spanish and English)
- Fast (~1000 texts/second)
- ~420MB size

Alternatives:
- `all-MiniLM-L6-v2`: English only, smaller, faster
- `multilingual-e5-large`: More accurate but slower (1024 dims)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Next.js (Frontend/API)                      │
│                         │                                   │
│                    HTTP POST                                │
│                         ▼                                   │
│   ┌─────────────────────────────────────────────────────┐  │
│   │          ml-cluster-client.ts                        │  │
│   │   (TypeScript client for Python service)             │  │
│   └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                     HTTP POST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                Flask API (Python)                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ EmbeddingService          ClusteringService          │  │
│  │ (Sentence Transformers)   (HDBSCAN)                  │  │
│  │                                                      │  │
│  │ DeduplicationService      DatabaseService            │  │
│  │ (Cosine Similarity)       (Supabase + pgvector)      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                    PostgreSQL
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Supabase                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │
│  │  articles  │  │  clusters  │  │ article_embeddings │    │
│  │            │  │            │  │ cluster_embeddings │    │
│  │            │  │            │  │    (pgvector)      │    │
│  └────────────┘  └────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Development Notes

- Embedding model loads once on startup (singleton)
- Embeddings are normalized; cosine similarity = dot product
- HDBSCAN automatically detects optimal number of clusters
- Outliers (label -1) are not assigned to any cluster
- Similarity threshold 0.75 works well for geopolitical news
- Deduplication threshold 0.92 is conservative (avoids false positives)

## Troubleshooting

### "No module named 'sentence_transformers'"
```bash
pip install sentence-transformers
```

### "pgvector extension not found"
Run in Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Model takes long to load
Normal the first time (~30 seconds). It downloads and caches locally.

### Out of memory
The model uses ~1.5GB RAM. Use `all-MiniLM-L6-v2` for lower consumption.
