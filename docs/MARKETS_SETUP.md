# Market Data Setup

## Steps to get real data from Finnhub

### 1. Get Finnhub API Key

1. Go to https://finnhub.io/
2. Sign up (free up to 60 calls/min)
3. Go to your Dashboard → API Key
4. Copy your API key

### 2. Configure in `.env.local`

```env
FINNHUB_API_KEY=your-api-key-here
```

### 3. Verify symbols exist in the database

Symbols must be in the `market_symbols` table with `is_active = true`.

You can verify in Supabase Dashboard → Table Editor → market_symbols

### 4. Update market data

**Option A: From the UI**
1. Go to `/markets` in the application
2. Click the "Update data" button in the top right corner
3. Wait for the update to complete

**Option B: From terminal (PowerShell)**

```powershell
# Option 1: Use curl.exe
curl.exe -X POST http://localhost:3000/api/markets/update -H "x-manual-trigger: true"

# Option 2: Use Invoke-WebRequest
Invoke-WebRequest -Uri "http://localhost:3000/api/markets/update" `
  -Method POST `
  -Headers @{"x-manual-trigger" = "true"}

# Option 3: Simple GET (development only)
curl.exe http://localhost:3000/api/markets/update
```

### 5. Verify data was updated

1. Go to `/markets` - you should see real prices
2. Or verify in Supabase Dashboard → Table Editor → market_quotes

## Troubleshooting

### "No symbols to update"
- Verify there are symbols in `market_symbols` with `is_active = true`
- Run the seed data migration if no symbols exist

### "Unauthorized"
- Make sure to use the header `x-manual-trigger: true`
- Or configure `CRON_SECRET` in `.env.local`

### "FINNHUB_API_KEY not configured"
- Verify the variable is in `.env.local`
- Restart the development server (`npm run dev`)

### Data still at 0%
- Verify the Finnhub API key is valid
- Check the server console for errors
- Verify symbols exist on Finnhub (e.g., `AAPL`, `MSFT`)

### Rate Limit Exceeded
- Finnhub free tier: 60 calls/minute
- The system now handles rate limiting automatically
- Updates are processed with throttling (1 request per second)
- With 150+ symbols, the full update may take several minutes
- The system prioritizes quotes over candles to ensure updated data
- Candles are only updated for symbols with recent quotes (last 24h)

## Common symbols for testing

- **Stocks**: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `TSLA`
- **Indices**: `SPY`, `QQQ`, `DIA`
- **Commodities**: `CL=F` (crude oil), `GC=F` (gold)
- **Crypto**: `BTC-USD`, `ETH-USD`

## Automation (Production)

**IMPORTANT**: With 150+ symbols, a full update may take 3-5 minutes due to the 60 requests/minute rate limit.

Configure a cron job to update data every 15-30 minutes:

```bash
# Every 15 minutes (recommended for frequent data)
*/15 * * * * curl -X POST https://your-domain.com/api/markets/update \
  -H "x-cron-secret: your-cron-secret"

# Or every 30 minutes (more conservative with rate limit)
*/30 * * * * curl -X POST https://your-domain.com/api/markets/update \
  -H "x-cron-secret: your-cron-secret"
```

Or use Vercel Cron Jobs, GitHub Actions, etc.

### Automatic Rate Limiting

The system now includes:
- **Automatic rate limiter**: Respects 60 requests/minute
- **Throttling**: 1 request per second (1.1s for safety)
- **429 error handling**: Automatic retry with backoff
- **Prioritization**: Quotes first, candles after (only for active symbols)
- **Optimization**: Candles only updated for symbols with recent quotes

This means with 150 symbols:
- Phase 1 (quotes): ~2.5 minutes
- Phase 2 (candles): ~1-2 additional minutes (active symbols only)
- **Total**: ~3-5 minutes for full update
