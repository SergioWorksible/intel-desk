# OSINT Integration and News Ticker

## Summary

A complete OSINT (Open Source Intelligence) integration has been implemented with mention analysis and a real-time news ticker for the main dashboard.

## Implemented Features

### 1. Real-Time News Ticker (`NewsTicker`)

**Location**: `components/news-ticker.tsx`

- **Features**:
  - Continuous scrolling of recent news (last 24 hours)
  - Pause on mouse hover (`pauseOnHover`)
  - Shows mentioned countries, title, date, and severity
  - Links to related clusters or articles
  - Automatic refresh every 30 seconds
  - Gradient edges for visual effect

**API**: `app/api/news/ticker/route.ts`
- Fetches articles from the last 24 hours
- **Geopolitical filtering**: Only shows geopolitically relevant articles
  - Prioritizes articles in clusters (already analyzed as geopolitical)
  - Includes articles with mentioned countries
  - Filters by geopolitical keywords (government, diplomacy, conflict, etc.)
  - Excludes non-geopolitical content (celebrities, entertainment, etc.)
- Includes severity information from clusters
- Ordered by: 1) Cluster presence, 2) Severity, 3) Publication date

**Integration**: 
- Added to main layout (`components/layout/app-layout.tsx`)
- Visible on all dashboard pages
- Positioned below the header

### 2. OSINT Mention Analysis

**Location**: `lib/osint/mention-analysis.ts`

**Functionalities**:

#### `analyzeMentions(article)`
- Analyzes an individual article using OpenAI GPT-4o-mini
- Extracts:
  - **Countries**: ISO 2-letter codes
  - **Entities**:
    - People (political leaders, public figures)
    - Organizations (governments, international institutions)
    - Locations (cities, regions, conflict zones)
    - Events (key geopolitical events)
  - **Topics**: Relevant geopolitical topics
  - **Sentiment**: Overall tone (positive/neutral/negative)
  - **Key mentions**: Important mentions with context and frequency

#### `batchAnalyzeMentions(articles)`
- Processes multiple articles in batches
- Avoids rate limits with delays between batches
- Returns a Map with analysis per article

#### `updateArticleWithMentions(supabase, articleId, analysis)`
- Updates the article in the database with:
  - Detected countries
  - Extracted topics
  - Structured entities (JSONB)

#### `getMentionStats(supabase, startDate, endDate)`
- Generates mention statistics for a period:
  - Top mentioned countries
  - Top entities (people/organizations)
  - Topic trends

### 3. OSINT Analysis API

**Location**: `app/api/osint/analyze-mentions/route.ts`

**Endpoints**:

#### POST `/api/osint/analyze-mentions`
Analyzes mentions for specific articles.

**Body options**:
```json
{
  "article_id": "uuid"  // Analyze a specific article
}
```
```json
{
  "batch_ids": ["uuid1", "uuid2"]  // Analyze multiple articles
}
```
```json
{
  "time_range": 24  // Analyze articles from the last N hours without mentions
}
```

#### GET `/api/osint/analyze-mentions?hours=24`
Gets mention statistics for a period.

**Response**:
```json
{
  "success": true,
  "stats": {
    "country_mentions": [{"country": "US", "count": 45}, ...],
    "top_entities": [{"entity": "Joe Biden", "type": "person", "count": 12}, ...],
    "topic_trends": [{"topic": "trade", "count": 23}, ...]
  }
}
```

## Usage

### Manual Analysis

1. **From the Dashboard**:
   - Button "Analyze OSINT mentions" on `/overview`
   - Automatically analyzes articles from the last 24 hours without mentions

2. **From the API**:
   ```bash
   # Analyze specific article
   curl -X POST http://localhost:3000/api/osint/analyze-mentions \
     -H "Content-Type: application/json" \
     -d '{"article_id": "uuid"}'
   
   # Analyze last 24h
   curl -X POST http://localhost:3000/api/osint/analyze-mentions \
     -H "Content-Type: application/json" \
     -d '{"time_range": 24}'
   
   # Get statistics
   curl http://localhost:3000/api/osint/analyze-mentions?hours=24
   ```

### Automatic Integration (Future)

To integrate OSINT analysis automatically after ingestion, you can modify `app/api/cron/ingest/route.ts`:

```typescript
// After processing new articles
if (results.articles_new > 0) {
  // Analyze mentions in background
  fetch('/api/osint/analyze-mentions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ time_range: 1 }), // Last hour
  }).catch(console.error)
}
```

## Data Structure

### Article with Mentions
```typescript
{
  id: string
  title: string
  countries: string[]  // ["US", "CN", "RU"]
  topics: string[]     // ["trade", "military", "diplomacy"]
  entities: {
    people: string[]
    organizations: string[]
    locations: string[]
    events: string[]
    key_mentions: Array<{
      entity: string
      type: string
      context: string
      frequency: number
    }>
    sentiment: "positive" | "neutral" | "negative"
  }
}
```

## Configuration

### Required Environment Variables

```env
OPENAI_API_KEY=sk-...  # Required for mention analysis
```

### Rate Limits

- OpenAI GPT-4o-mini: ~500 requests/minute
- The code includes automatic delays between batches (200ms-1000ms)
- Recommended batch size: 5 articles per batch

## Performance

- **Individual analysis**: ~2-3 seconds per article
- **Batch of 50 articles**: ~2-3 minutes (with delays)
- **News ticker**: Refresh every 30 seconds
- **Initial load**: <100ms to fetch news

## Suggested Next Steps

1. **Mentions Dashboard**: Create dedicated page to visualize mention statistics
2. **Mention Alerts**: Configure alerts when specific countries/entities are mentioned
3. **Temporal Analysis**: Mention trend charts over time
4. **Automatic Integration**: Enable OSINT analysis automatically after each ingestion
5. **Specialized OSINT Sources**: Add OSINT-specific RSS feeds (GDELT, etc.)

## Technical Notes

- Analysis uses `gpt-4o-mini` for cost/quality balance
- Countries are normalized to ISO 2-letter codes
- Entities are stored in JSONB format for flexibility
- NewsTicker uses `requestAnimationFrame` for smooth animation
- Articles are duplicated to create an infinite loop without jumps
