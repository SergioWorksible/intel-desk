<p align="center">
  <h1 align="center">Intel Desk</h1>
  <p align="center"><strong>Geopolitical Intelligence Platform</strong></p>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License: AGPL-3.0"></a>
</p>

<!-- ![Dashboard](docs/screenshots/dashboard.png) -->

---

## Description

Intel Desk is an advanced geopolitical intelligence and market analysis platform with a rigorous analytical approach and "classified briefing" aesthetic. Designed to discipline thinking, ground analysis in evidence, and produce actionable insights with full traceability.

> **"Discipline thinking. Ground analysis. Act with evidence."**

---

## Features

1. **Daily Intelligence Briefings** -- AI-generated summaries with verified facts and citations
2. **ML-Powered Event Clustering** -- Automatic grouping of related news using HDBSCAN + sentence embeddings
3. **Hypothesis Tracker** -- Probabilistic predictions with red team analysis and pre-mortem
4. **Strategic Playbooks** -- AI-generated action plans for companies, investors, individuals, governments
5. **Causal Graphs** -- Interactive visualization of event relationships using React Flow
6. **Research Mode** -- Perplexity-style search grounded in the database
7. **Market Dashboard** -- Financial markets as geopolitical sensors (150+ symbols)
8. **Interactive World Map** -- Geographic visualization with MapLibre GL
9. **Country Cards** -- Structural summaries with active risks
10. **Alert System** -- Real-time monitoring with threshold, volume, and correlation alerts
11. **Source Management** -- RSS feed administration with reputation scoring
12. **Role-Based Access** -- Admin, Analyst, Reader roles with Row Level Security
13. **OSINT Integration** -- Optional integration with GDELT, NewsAPI, Event Registry

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript + Python |
| UI | Tailwind CSS + shadcn/ui (Radix) |
| State | TanStack Query + Zustand |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | OpenAI GPT-4 Turbo + Perplexity Sonar |
| ML | HDBSCAN + Sentence Transformers |
| Maps | MapLibre GL |
| Charts | Recharts |
| Graphs | React Flow |
| Tables | TanStack Table |

---

## Quick Start

### Docker

```bash
git clone https://github.com/sergiconejo/intel-desk.git
cd intel-desk
cp .env.example .env
cp ml-cluster/.env.example ml-cluster/.env
# Edit both .env files with your API keys
docker compose up
```

### Manual Setup

```bash
# Frontend
npm install
npm run dev

# ML Service (separate terminal)
cd ml-cluster
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py

# Database
npx supabase start
npx supabase db push
```

---

## Environment Variables

### Next.js App (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (`https://your-project.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable (anon) key -- safe for browser |
| `SUPABASE_SECRET_KEY` | Yes | Supabase service-role secret key -- server-side only |
| `SUPABASE_PASSWORD` | Yes | Database password chosen when creating the Supabase project |
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-based analysis and summarization |
| `PERPLEXITY_API_KEY` | Yes | Perplexity API key for real-time web-augmented queries |
| `FINNHUB_API_KEY` | No | Finnhub key for real-time stock and forex data |
| `ALPHA_VANTAGE_API_KEY` | No | Alpha Vantage key for historical market data and indicators |
| `CRON_SECRET` | Yes | Random secret to authenticate scheduled cron job requests |
| `NEXT_PUBLIC_APP_URL` | Yes | Public-facing app URL (default `http://localhost:3000`) |

### ML Cluster Service (`ml-cluster/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Same Supabase project URL used by the Next.js app |
| `SUPABASE_SECRET_KEY` | Yes | Supabase service-role secret key |
| `DATABASE_URL` | Yes | Direct PostgreSQL connection string for the ML service |
| `FLASK_ENV` | No | Server environment: `development` or `production` |
| `FLASK_DEBUG` | No | Enable debug mode (`1`) or disable (`0`) |
| `PORT` | No | Flask server port (default `5001`) |
| `EMBEDDING_MODEL` | No | Sentence-Transformers model for embeddings (default `paraphrase-multilingual-MiniLM-L12-v2`) |
| `MIN_CLUSTER_SIZE` | No | Minimum articles to form a cluster (default `2`) |
| `MIN_SAMPLES` | No | HDBSCAN conservatism parameter (default `1`) |
| `SIMILARITY_THRESHOLD` | No | Cosine-similarity threshold for cluster assignment (default `0.75`) |
| `DEDUP_THRESHOLD` | No | Cosine-similarity threshold for duplicate detection (default `0.92`) |
| `OPENAI_API_KEY` | No | OpenAI key for GPT-generated cluster titles and summaries; falls back to extractive methods without it |

---

## Database Schema Overview

All Supabase migrations live in `supabase/migrations/`. Key tables include:

- **articles** -- Ingested news articles with metadata and embeddings
- **clusters** -- ML-generated event clusters grouping related articles
- **hypotheses** -- Probabilistic predictions with red team analysis
- **playbooks** -- AI-generated strategic action plans
- **alerts** -- Real-time monitoring rules (threshold, volume, correlation)
- **market_symbols** -- Tracked financial instruments (150+ symbols)
- **sources** -- RSS feeds with reputation scoring
- **profiles** -- User profiles linked to Supabase Auth with role-based access

---

## API Endpoints

The ML clustering service exposes the following REST API:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/cluster` | Run clustering pipeline |
| POST | `/api/embed` | Generate text embeddings |
| POST | `/api/similarity` | Calculate text similarity |
| POST | `/api/deduplicate` | Find duplicate articles |
| POST | `/api/find-cluster` | Find best cluster for article |
| POST | `/api/recluster` | Reset and re-cluster all articles |
| POST | `/api/reset-clusters` | Delete all clusters |

---

## Architecture

Intel Desk follows a two-service architecture:

- **Next.js App** -- Handles the UI, server-side rendering, API routes (briefings, hypotheses, playbooks, alerts), authentication, and all AI integrations (OpenAI, Perplexity).
- **Python ML Service** -- A standalone Flask microservice responsible for text embedding, HDBSCAN clustering, deduplication, and similarity calculations. Communicates with the same Supabase PostgreSQL database.

Both services share the Supabase database as the single source of truth. Row Level Security policies enforce access control at the database layer.

For a detailed breakdown, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## AI Integrations

- **OpenAI GPT-4 Turbo** -- Powers daily intelligence briefings, hypothesis analysis (red team / pre-mortem), strategic playbook generation, and research mode queries.
- **Perplexity Sonar Pro** -- Provides real-time web enrichment for briefings and research, grounding AI outputs in current open-source information.
- All AI responses follow strict JSON contracts validated with TypeScript schemas, ensuring structured and predictable outputs throughout the platform.

---

## ML Clustering

The Python-based ML service uses HDBSCAN combined with multilingual Sentence Transformers to automatically group related articles into event clusters. It supports incremental clustering (assigning new articles to existing clusters), full re-clustering, and near-duplicate detection.

For configuration options and detailed documentation, see [`ml-cluster/README.md`](ml-cluster/README.md).

---

## Contributing

Contributions are welcome. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines on how to get started.

---

## License

This project is licensed under the **GNU Affero General Public License v3.0** -- see the [LICENSE](LICENSE) file for details.

Copyright 2026 Sergio Conejo.
