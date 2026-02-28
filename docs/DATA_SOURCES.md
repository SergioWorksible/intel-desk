# Real Data Sources - Intel Desk

This guide explains how to obtain real data for Intel Desk. The system is designed to work with real data; you only need to configure the sources.

## 📰 RSS News Sources

### ✅ Automatic Media Migration

**Good news!** The system includes an SQL migration (`008_expand_media_sources.sql`) that automatically adds **over 150** international and national outlets from multiple countries:

- **International**: AFP, Xinhua, TASS, EFE, ANSA, DPA, Kyodo, Yonhap
- **United States**: NYT, WaPo, WSJ, Bloomberg, NPR, ABC, CBS, NBC, Defense News, etc.
- **Spain**: El País, El Mundo, ABC, La Vanguardia, El Confidencial, RTVE, etc.
- **Mexico**: El Universal, Reforma, La Jornada, Milenio, Excélsior, etc.
- **Argentina**: Clarín, La Nación, Página/12, Infobae, etc.
- **Colombia**: El Tiempo, El Espectador, Semana, Portafolio
- **Brazil**: Folha, O Globo, Estadão, Valor Econômico, BBC Brasil
- **France**: Le Monde, Le Figaro, Libération, L'Express, RFI
- **Germany**: Der Spiegel, Die Zeit, Süddeutsche, FAZ, Die Welt
- **Italy**: Corriere, La Repubblica, Il Sole 24 Ore, La Stampa
- **China**: China Daily, Global Times, SCMP, CGTN
- **Japan**: Japan Times, Nikkei Asia, Asahi, Mainichi, Yomiuri
- **India**: Times of India, The Hindu, Hindustan Times, Indian Express, NDTV
- **And many more**: UK, South Korea, Russia, Turkey, Israel, Saudi Arabia, Iran, Egypt, South Africa, Nigeria, Australia, Canada, Asia-Pacific countries

**To apply the migration:**
```bash
# Run the migration in Supabase
supabase migration up
# Or from the Supabase dashboard
```

### How to Add RSS Sources Manually

1. **Go to `/sources` in the application**
2. **Click "Add source"**
3. **Fill in the fields:**
   - **Name**: Source name (e.g., "Reuters World News")
   - **Type**: `media`, `wire`, `official`, `think-tank`, or `sensor`
   - **RSS URL**: Feed RSS URL
   - **Website URL**: Website URL
   - **Country**: ISO country code (e.g., `US`, `GB`, `CN`, `ES`, `MX`)
   - **Language**: Language code (e.g., `en`, `es`, `zh`, `pt`, `fr`, `de`)
   - **Reputation Base**: Score 0-100 (higher = more reliable)

### Recommended RSS Sources

#### International News
- **Reuters**: `https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best`
- **Reuters World**: `https://www.reuters.com/rssFeed/worldNews`
- **AP News**: `https://apnews.com/apf-topnews`
- **BBC World**: `https://feeds.bbci.co.uk/news/world/rss.xml`
- **Al Jazeera**: `https://www.aljazeera.com/xml/rss/all.xml`
- **DW News**: `https://rss.dw.com/rdf/rss-en-all`
- **France 24**: `https://www.france24.com/en/rss`

#### Geopolitical Analysis
- **Foreign Policy**: `https://foreignpolicy.com/feed/`
- **Foreign Affairs**: `https://www.foreignaffairs.com/feed`
- **The Diplomat**: `https://thediplomat.com/feed/`
- **War on the Rocks**: `https://warontherocks.com/feed/`
- **CSIS**: `https://www.csis.org/rss-feeds`
- **Brookings**: `https://www.brookings.edu/feed/`

#### Specialized Sources
- **Energy News**:
  - Oil & Gas Journal: `https://www.ogj.com/rss-feeds.html`
  - Energy Central: `https://energycentral.com/rss.xml`
  
- **Defense News**:
  - Defense News: `https://www.defensenews.com/arc/outboundfeeds/rss/`
  - Janes: `https://www.janes.com/rss`
  
- **Trade & Economics**:
  - Financial Times: `https://www.ft.com/rss`
  - WSJ World: `https://www.wsj.com/xml/rss/3_7085.xml`
  - Bloomberg: `https://www.bloomberg.com/feed/topics/world`

#### Regional Sources

- **Spain and Latin America**:
  - El País: `https://elpais.com/internacional/rss/`
  - El Universal (Mexico): `https://www.eluniversal.com.mx/rss.xml`
  - Clarín (Argentina): `https://www.clarin.com/rss/mundo.html`
  - El Tiempo (Colombia): `https://www.eltiempo.com/rss/mundo.xml`
  - Folha (Brazil): `https://www1.folha.uol.com.br/internacional/rss091.xml`
  
- **Asia**:
  - South China Morning Post: `https://www.scmp.com/rss/feed`
  - Nikkei Asia: `https://asia.nikkei.com/rss`
  - The Straits Times: `https://www.straitstimes.com/rss`
  - The Japan Times: `https://www.japantimes.co.jp/rss/news/`
  - The Hindu (India): `https://www.thehindu.com/news/international/feeder/default.rss`
  
- **Europe**:
  - Politico Europe: `https://www.politico.eu/feed/`
  - EU Observer: `https://euobserver.com/rss`
  - Le Monde: `https://www.lemonde.fr/international/rss_full.xml`
  - Der Spiegel: `https://www.spiegel.de/international/index.rss`
  - Corriere della Sera: `https://www.corriere.it/rss/esteri.xml`
  
- **Middle East**:
  - Middle East Eye: `https://www.middleeasteye.net/rss.xml`
  - Haaretz: `https://www.haaretz.com/rss`
  - Arab News: `https://www.arabnews.com/rss.xml`
  - Al-Monitor: `https://www.al-monitor.com/rss`

### Run Ingestion

Once sources are added:

1. **Manual (development)**:
   ```bash
   curl -X POST http://localhost:3000/api/cron/ingest \
     -H "x-manual-trigger: true"
   ```

2. **Automatic (production)**:
   - Configure a cron job that calls `/api/cron/ingest` every X minutes
   - Or use Vercel Cron Jobs, GitHub Actions, etc.

## 📊 Market Data

### Finnhub (Recommended)

1. **Register at**: https://finnhub.io/
2. **Get your API key** (free up to 60 calls/min)
3. **Add to `.env.local`**:
   ```env
   FINNHUB_API_KEY=your-api-key-here
   ```

**Available symbols**:
- Stocks: `AAPL`, `MSFT`, `GOOGL`, etc.
- Indices: `SPY`, `QQQ`, `DIA`
- Commodities: `CL=F` (crude oil), `GC=F` (gold)
- Crypto: `BTC-USD`, `ETH-USD`

### Alpha Vantage (Alternative)

1. **Register at**: https://www.alphavantage.co/support/#api-key
2. **Add to `.env.local`**:
   ```env
   ALPHA_VANTAGE_API_KEY=your-api-key-here
   ```

### Implementing Data Fetching

You need to create a service that fetches real data. Example:

```typescript
// lib/markets/finnhub.ts
export async function fetchQuote(symbol: string) {
  const response = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`
  )
  return response.json()
}
```

Then create a cron job to update data periodically.

## 🌍 Specialized Geopolitical Data

### Available APIs

#### 1. **NewsAPI** (Aggregated news)
- **URL**: https://newsapi.org/
- **Free**: 100 requests/day
- **Use**: News search by country/topic
- **Example**:
  ```typescript
  const response = await fetch(
    `https://newsapi.org/v2/top-headlines?country=us&apiKey=${API_KEY}`
  )
  ```

#### 2. **Event Registry** (Geopolitical events)
- **URL**: https://eventregistry.org/
- **Free**: Limited
- **Use**: Structured events, entities, relationships

#### 3. **GDELT** (Global Database of Events)
- **URL**: https://www.gdeltproject.org/
- **Free**: Yes
- **Use**: Structured geopolitical events, country mentions
- **API**: https://api.gdeltproject.org/api/v2/doc/doc

#### 4. **Crisis Group** (Conflicts)
- **RSS**: `https://www.crisisgroup.org/rss`
- **Use**: Conflict and crisis analysis

#### 5. **UN News**
- **RSS**: `https://news.un.org/en/rss`
- **Use**: Official United Nations news

## 🔧 Current Configuration

### System Status

✅ **Implemented**:
- RSS ingestion (`lib/ingest/rss.ts`)
- ML article clustering (Python service in `ml-cluster/`)
- Basic fallback clustering (JavaScript)
- Full-text search in Supabase
- Ingestion API (`/api/cron/ingest`)

### ⚠️ Article Clustering

The system has **two clustering methods**:

1. **ML Clustering (Python)** - Recommended, more accurate
   - Uses multilingual semantic embeddings
   - Automatic HDBSCAN clustering
   - Intelligent deduplication
   - Requires the Python service to be running

2. **Smart Clustering (JavaScript)** - Fallback
   - Used automatically when Python service is unavailable
   - Text similarity based
   - Less accurate but functional

#### Verify ML Cluster Service is Running

```powershell
# Check service status
.\scripts\check-ml-service.ps1
```

If the service is not running:

```powershell
# Start ML Cluster service
cd ml-cluster
.\start.ps1
```

Or manually:

```bash
cd ml-cluster
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python run.py
```

The service should be available at `http://localhost:5001`

#### Configure Service URL (optional)

If the service runs on a different URL or port, set:

```env
# In .env.local or .env
ML_CLUSTER_URL=http://localhost:5001
```

❌ **Pending** (you need to implement):
- Real market data fetching
- External API integration (NewsAPI, GDELT, etc.)
- Automatic price updates

### Next Steps

1. **Add RSS sources**:
   - Go to `/sources` in the app
   - Add the RSS sources you want to monitor
   - Run ingestion manually or configure a cron job

2. **Configure market APIs**:
   - Get API keys from Finnhub/Alpha Vantage
   - Implement data fetching (see example above)
   - Create a cron job to update prices

3. **Optional - Integrate specialized APIs**:
   - NewsAPI for advanced searches
   - GDELT for structured events
   - Event Registry for entity analysis

## 📝 Example: Adding an RSS Source

```sql
-- Direct SQL example (or use the UI at /sources)
INSERT INTO sources (
  name, 
  type, 
  rss_url, 
  website_url, 
  country, 
  language, 
  reputation_base,
  enabled
) VALUES (
  'Reuters World News',
  'news',
  'https://www.reuters.com/rssFeed/worldNews',
  'https://www.reuters.com',
  'GB',
  'en',
  85,
  true
);
```

## 🚀 Run First Ingestion

Once sources are added:

```bash
# Development
curl -X POST http://localhost:3000/api/cron/ingest \
  -H "x-manual-trigger: true"

# Or from the Settings UI
```

Articles will appear in:
- `/clusters` - Grouped events
- `/briefing` - Daily briefing (requires generation)
- `/research` - Search and analysis

## ⚠️ Important Notes

1. **Rate Limits**: Respect API rate limits
2. **Licenses**: Some sources have usage restrictions
3. **Cost**: Some APIs have limited free tiers
4. **Quality**: Not all RSS sources are equal - adjust `reputation_base` based on reliability

## 🔗 Useful Resources

- **RSS Feed Finder**: https://rss.com/blog/rss-feed-finder/
- **Feed Validator**: https://validator.w3.org/feed/
- **Finnhub Docs**: https://finnhub.io/docs/api
- **Alpha Vantage Docs**: https://www.alphavantage.co/documentation/
- **GDELT Docs**: https://www.gdeltproject.org/data.html
