# Automatic Linking of Geopolitical Events to Markets

## Description

The system now **automatically** links geopolitical events (clusters) to relevant market symbols using AI. Manual linking is no longer required.

## How It Works

1. **When new clusters are created** (during the ingestion process), the system automatically:
   - Analyzes the geopolitical event (title, summary, topics, affected countries)
   - Uses AI to determine which market symbols are relevant
   - Creates automatic links with an explanation of why

2. **The AI considers**:
   - Affected economic sector (energy, defense, technology, commodities)
   - Countries involved and their companies/indices
   - Event topics (sanctions, conflicts, trade, etc.)
   - Asset type (stocks, commodities, forex, indices)

## Imported Symbols

An SQL file (`004_market_symbols_import.sql`) has been created with **over 150 important symbols** organized in:

- **Energy**: XOM, CVX, BP, SHEL, TTE, etc.
- **Defense**: LMT, RTX, BA, NOC, GD, etc.
- **Technology**: AAPL, MSFT, GOOGL, TSM, ASML, etc.
- **Mining/Metals**: FCX, NEM, GOLD, RIO, BHP, VALE, etc.
- **Agriculture**: ADM, BG, DE, CTVA, MOS, etc.
- **Financials**: JPM, BAC, WFC, GS, MS, C, etc.
- **China**: BABA, JD, NIO, XPEV, etc.
- **Indices**: SPY, QQQ, DIA, VIX, international indices
- **Commodities**: Crude oil, natural gas, gold, silver, copper, wheat, etc.
- **Forex**: Major currency pairs
- **Crypto**: BTC, ETH, SOL, etc.

## Importing Symbols

### Option 1: From Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/004_market_symbols_import.sql`
3. Execute the SQL

### Option 2: From the UI

1. Go to `/markets`
2. Click "Import symbols"
3. Enter symbols one per line
4. Select the asset type
5. Click "Import"

## Manual Linking (if needed)

If you need to manually link a specific event:

```bash
curl -X POST http://localhost:3000/api/markets/auto-link-events \
  -H "Content-Type: application/json" \
  -H "x-manual-trigger: true" \
  -d '{"clusterId": "cluster-uuid"}'
```

Or to link all recent events:

```bash
curl -X POST http://localhost:3000/api/markets/auto-link-events \
  -H "Content-Type: application/json" \
  -H "x-manual-trigger: true" \
  -d '{"autoLinkAll": true}'
```

## Viewing Geopolitical Topics

Automatically linked geopolitical topics appear in the "Geopolitical topics" section on the markets page (`/markets`).

Each topic shows:
- Affected symbols
- Related events
- Severity
- Direct links to clusters and symbols

## Automatic Configuration

The system automatically links events when:
- The ingestion cron runs (`/api/cron/ingest`)
- New clusters are created
- You have `OPENAI_API_KEY` configured

## Automatic Linking Examples

**Event**: "Russia sanctions over Ukraine conflict"
**Automatically linked symbols**:
- RSX (Russia ETF)
- USDRUB (USD/Ruble)
- GAZP.ME (Gazprom)
- LKOH.ME (Lukoil)
- XOM, CVX (global energy)
- GLD (gold as safe haven)

**Event**: "Taiwan Strait tensions"
**Automatically linked symbols**:
- TSM (Taiwan Semiconductor)
- FXI (China ETF)
- EWT (Taiwan ETF)
- Semiconductors (NVDA, AMD, INTC)
- Defense (LMT, RTX, NOC)

## Notes

- Automatic linking only works if you have `OPENAI_API_KEY` configured
- Limited to 10 most relevant symbols per event to avoid noise
- Links include an explanation (rationale) and impact assessment
- You can review and remove links manually if needed
