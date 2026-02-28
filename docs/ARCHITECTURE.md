# Intel Desk Architecture

This document describes the system architecture of Intel Desk, a geopolitical intelligence and market analysis platform.

## Component Overview

Intel Desk follows a two-service architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Application                          │
│  • App Router (Next.js 14)                                       │
│  • UI (Tailwind + shadcn/ui)                                     │
│  • API Routes (briefings, hypotheses, playbooks, alerts, cron)   │
│  • Server Actions (Supabase auth, RLS)                            │
│  • AI Integrations (OpenAI GPT-4, Perplexity Sonar)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP REST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ML Cluster Service (Flask)                   │
│  • Sentence Transformers (embeddings)                             │
│  • HDBSCAN clustering                                            │
│  • Deduplication (cosine similarity)                             │
│  • pgvector (similarity search)                                   │
│  • GPT enrichment (optional)                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ PostgreSQL
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase (PostgreSQL)                       │
│  • articles, clusters, article_embeddings, cluster_embeddings    │
│  • profiles, sources, hypotheses, playbooks, alerts              │
│  • market_symbols, market_quotes                                 │
│  • Row Level Security (RLS) for access control                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Article Ingestion
- Cron job (`/api/cron/ingest`) fetches RSS feeds from configured sources
- Articles are stored in `articles` table with metadata
- ML service is invoked to cluster new articles and assign to events

### 2. ML Clustering Pipeline
1. Fetch unclustered articles from database
2. Generate embeddings via Sentence Transformers
3. Store embeddings in `article_embeddings` (pgvector)
4. Deduplicate near-duplicate articles
5. Match against existing clusters (pgvector similarity search)
6. HDBSCAN clusters remaining articles
7. Create new clusters, optionally enrich with GPT

### 3. AI Contracts
All AI responses (briefings, hypotheses, playbooks, research) follow strict JSON schemas validated with TypeScript Zod schemas. This ensures structured, predictable outputs across the platform.

## Security Model

- **Authentication**: Supabase Auth (email/password, OAuth)
- **Authorization**: Row Level Security (RLS) policies at database layer
- **Roles**: Admin, Analyst, Reader (enforced via `profiles.role`)
- **API Keys**: Server-side only; never exposed to browser
- **Cron Jobs**: Protected by `CRON_SECRET` header verification

## Key Design Decisions

1. **Single database**: Both Next.js and ML service share Supabase PostgreSQL
2. **pgvector**: Enables O(log n) similarity search for embeddings
3. **Standalone ML service**: Python ML stack (Sentence Transformers, HDBSCAN) separate from Node.js
4. **Lazy model loading**: Embedding model loads once at first request
5. **Fallback clustering**: JavaScript fallback when ML service unavailable
