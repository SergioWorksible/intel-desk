# Deployment Guide

This guide covers deployment options for Intel Desk.

## Option 1: Docker Compose

Best for: Self-hosted VPS, single server.

```bash
git clone https://github.com/sergiconejo/intel-desk.git
cd intel-desk
cp .env.example .env
cp ml-cluster/.env.example ml-cluster/.env
# Edit both .env files with your API keys

# Start Supabase locally first (or use Supabase Cloud)
npx supabase start
npx supabase db push

# Build and run
docker compose up -d
```

The web app will be available on port 3000 and the ML service on port 5001.

## Option 2: VPS + Nginx

Best for: Production on a VPS (Ubuntu, Debian).

1. **Install dependencies**: Node.js 18+, Python 3.10+, PostgreSQL/Supabase
2. **Deploy Next.js**: Build with `npm run build` and serve with `npm start` or use PM2
3. **Deploy ML service**: Run `ml-cluster` with Gunicorn (see `ml-cluster/gunicorn_config.py`)
4. **Configure Nginx** as reverse proxy for both services
5. **SSL**: Use Certbot for Let's Encrypt certificates

## Option 3: Vercel (Frontend) + External ML Service

Best for: Quick deployment with Vercel's serverless platform.

1. Deploy Next.js to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy ML service separately (Railway, Render, or your own VPS)
4. Configure `ML_CLUSTER_URL` in Vercel to point to your ML service
5. Supabase: Use Supabase Cloud (create project at supabase.com)

## Option 4: Supabase Cloud Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations: `npx supabase db push` (or apply migrations manually)
3. Enable pgvector: Run `CREATE EXTENSION IF NOT EXISTS vector;` in SQL Editor
4. Copy connection strings and API keys to your `.env` files

## Cron Jobs

For ingestion and market updates, configure cron:

```bash
# Every 15 minutes - ingest RSS
*/15 * * * * curl -X POST https://your-domain.com/api/cron/ingest \
  -H "x-cron-secret: YOUR_CRON_SECRET"

# Every 30 minutes - update markets
*/30 * * * * curl -X POST https://your-domain.com/api/markets/update \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

Vercel users: Use Vercel Cron Jobs in `vercel.json`.

## Environment Variables Checklist

| Variable | Next.js | ML Service | Required |
|----------|---------|------------|----------|
| SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL | ✓ | ✓ | Yes |
| SUPABASE_SECRET_KEY | ✓ | ✓ | Yes |
| DATABASE_URL | - | ✓ | Yes (for pgvector) |
| OPENAI_API_KEY | ✓ | ✓ | Yes |
| PERPLEXITY_API_KEY | ✓ | - | Yes |
| CRON_SECRET | ✓ | - | Yes |
| FINNHUB_API_KEY | ✓ | - | No |
| ALPHA_VANTAGE_API_KEY | ✓ | - | No |

## Dockerfile Notes

- **Next.js**: Uses standalone output; `server.js` is generated during build
- **ML Cluster**: Python 3.10 slim; installs Sentence Transformers (~2GB image)
- Both images expect `.env` files to be mounted or passed at runtime

## Troubleshooting

- **pgvector errors**: Ensure Session Mode (port 5432) or Direct Connection; avoid Transaction Mode (6543)
- **ML service timeout**: Increase `statement_timeout` or reduce batch sizes
- **CORS**: ML service has CORS enabled for Next.js origins
