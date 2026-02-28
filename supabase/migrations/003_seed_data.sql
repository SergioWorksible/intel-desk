-- Intel Desk Seed Data
-- Initial data for sources, countries, market symbols, and settings

-- Default settings
INSERT INTO settings (key, value, description) VALUES
    ('allowlist_mode', 'false', 'When true, only allowlisted sources are used'),
    ('full_text_fetching', 'false', 'When true, fetch full article content (licensing implications)'),
    ('ingest_interval_minutes', '30', 'Interval between RSS ingestion runs'),
    ('briefing_generation_hour', '6', 'Hour (UTC) when daily briefing is generated'),
    ('data_retention_days', '365', 'Number of days to retain article data'),
    ('scoring_weights', '{"reputation_base": 0.3, "independence": 0.2, "recency": 0.25, "consistency": 0.15, "proximity": 0.1}', 'Weights for source scoring engine');

-- Sample sources (major news outlets)
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Reuters', 'wire', 'https://www.reuters.com/rssFeed/worldNews', 'https://www.reuters.com', 'UK', 'en', 85, ARRAY['wire', 'international', 'finance'], true),
    ('Associated Press', 'wire', 'https://apnews.com/apf-topnews', 'https://apnews.com', 'US', 'en', 85, ARRAY['wire', 'international'], true),
    ('BBC News', 'media', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'https://www.bbc.com/news', 'UK', 'en', 80, ARRAY['media', 'international'], true),
    ('Al Jazeera', 'media', 'https://www.aljazeera.com/xml/rss/all.xml', 'https://www.aljazeera.com', 'QA', 'en', 70, ARRAY['media', 'middle-east'], true),
    ('Financial Times', 'media', 'https://www.ft.com/rss/home', 'https://www.ft.com', 'UK', 'en', 85, ARRAY['media', 'finance', 'analysis'], true),
    ('The Economist', 'media', 'https://www.economist.com/international/rss.xml', 'https://www.economist.com', 'UK', 'en', 85, ARRAY['media', 'analysis'], true),
    ('Foreign Affairs', 'think-tank', 'https://www.foreignaffairs.com/rss.xml', 'https://www.foreignaffairs.com', 'US', 'en', 90, ARRAY['think-tank', 'analysis'], true),
    ('CSIS', 'think-tank', 'https://www.csis.org/analysis/feed', 'https://www.csis.org', 'US', 'en', 85, ARRAY['think-tank', 'defense', 'analysis'], true),
    ('Brookings Institution', 'think-tank', 'https://www.brookings.edu/feed/', 'https://www.brookings.edu', 'US', 'en', 85, ARRAY['think-tank', 'policy'], true),
    ('RAND Corporation', 'think-tank', 'https://www.rand.org/blog.xml', 'https://www.rand.org', 'US', 'en', 85, ARRAY['think-tank', 'defense', 'research'], true),
    ('UN News', 'official', 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', 'https://news.un.org', 'INT', 'en', 80, ARRAY['official', 'international'], true),
    ('Foreign Policy', 'media', 'https://foreignpolicy.com/feed/', 'https://foreignpolicy.com', 'US', 'en', 85, ARRAY['media', 'analysis', 'geopolitics'], true),
    ('The Diplomat', 'media', 'https://thediplomat.com/feed/', 'https://thediplomat.com', 'US', 'en', 75, ARRAY['media', 'asia-pacific', 'analysis'], true),
    ('War on the Rocks', 'think-tank', 'https://warontherocks.com/feed/', 'https://warontherocks.com', 'US', 'en', 80, ARRAY['think-tank', 'defense', 'analysis'], true),
    ('DW News', 'media', 'https://rss.dw.com/rdf/rss-en-all', 'https://www.dw.com', 'DE', 'en', 80, ARRAY['media', 'international', 'europe'], true),
    ('France 24', 'media', 'https://www.france24.com/en/rss', 'https://www.france24.com', 'FR', 'en', 75, ARRAY['media', 'international'], true),
    ('CNN International', 'media', 'http://rss.cnn.com/rss/edition.rss', 'https://www.cnn.com', 'US', 'en', 75, ARRAY['media', 'international'], true),
    ('The Guardian World', 'media', 'https://www.theguardian.com/world/rss', 'https://www.theguardian.com', 'UK', 'en', 80, ARRAY['media', 'international'], true),
    ('Politico', 'media', 'https://www.politico.com/rss/politicopicks.xml', 'https://www.politico.com', 'US', 'en', 75, ARRAY['media', 'politics', 'policy'], true),
    ('Axios World', 'media', 'https://www.axios.com/feeds/world.xml', 'https://www.axios.com', 'US', 'en', 75, ARRAY['media', 'international'], true),
    ('Stratfor', 'think-tank', 'https://worldview.stratfor.com/rss.xml', 'https://worldview.stratfor.com', 'US', 'en', 85, ARRAY['think-tank', 'geopolitics', 'analysis'], true),
    ('Carnegie Endowment', 'think-tank', 'https://carnegieendowment.org/rss/solr/?fa=feed', 'https://carnegieendowment.org', 'US', 'en', 85, ARRAY['think-tank', 'policy', 'analysis'], true),
    ('Chatham House', 'think-tank', 'https://www.chathamhouse.org/rss', 'https://www.chathamhouse.org', 'UK', 'en', 85, ARRAY['think-tank', 'international', 'analysis'], true),
    ('IISS', 'think-tank', 'https://www.iiss.org/rss', 'https://www.iiss.org', 'UK', 'en', 85, ARRAY['think-tank', 'defense', 'security'], true),
    ('Atlantic Council', 'think-tank', 'https://www.atlanticcouncil.org/feed/', 'https://www.atlanticcouncil.org', 'US', 'en', 80, ARRAY['think-tank', 'international', 'analysis'], true);

-- Major countries with initial data
INSERT INTO countries (code, name, region, subregion, capital, population, government_type, watchlist) VALUES
    ('US', 'United States', 'Americas', 'North America', 'Washington, D.C.', 331000000, 'Federal presidential constitutional republic', true),
    ('CN', 'China', 'Asia', 'East Asia', 'Beijing', 1400000000, 'Unitary one-party socialist republic', true),
    ('RU', 'Russia', 'Europe', 'Eastern Europe', 'Moscow', 144000000, 'Federal semi-presidential republic', true),
    ('GB', 'United Kingdom', 'Europe', 'Northern Europe', 'London', 67000000, 'Unitary parliamentary constitutional monarchy', true),
    ('DE', 'Germany', 'Europe', 'Western Europe', 'Berlin', 83000000, 'Federal parliamentary republic', true),
    ('FR', 'France', 'Europe', 'Western Europe', 'Paris', 67000000, 'Unitary semi-presidential republic', true),
    ('JP', 'Japan', 'Asia', 'East Asia', 'Tokyo', 126000000, 'Unitary parliamentary constitutional monarchy', true),
    ('IN', 'India', 'Asia', 'South Asia', 'New Delhi', 1380000000, 'Federal parliamentary republic', true),
    ('BR', 'Brazil', 'Americas', 'South America', 'Brasília', 212000000, 'Federal presidential republic', false),
    ('AU', 'Australia', 'Oceania', 'Australia and New Zealand', 'Canberra', 25600000, 'Federal parliamentary constitutional monarchy', false),
    ('CA', 'Canada', 'Americas', 'North America', 'Ottawa', 38000000, 'Federal parliamentary constitutional monarchy', false),
    ('KR', 'South Korea', 'Asia', 'East Asia', 'Seoul', 51700000, 'Unitary presidential republic', true),
    ('SA', 'Saudi Arabia', 'Asia', 'Western Asia', 'Riyadh', 34800000, 'Unitary Islamic absolute monarchy', true),
    ('IR', 'Iran', 'Asia', 'Western Asia', 'Tehran', 83900000, 'Unitary Khomeinist presidential Islamic republic', true),
    ('IL', 'Israel', 'Asia', 'Western Asia', 'Jerusalem', 9200000, 'Unitary parliamentary republic', true),
    ('TR', 'Turkey', 'Asia', 'Western Asia', 'Ankara', 84300000, 'Unitary presidential republic', true),
    ('UA', 'Ukraine', 'Europe', 'Eastern Europe', 'Kyiv', 44100000, 'Unitary semi-presidential republic', true),
    ('PL', 'Poland', 'Europe', 'Central Europe', 'Warsaw', 38400000, 'Unitary parliamentary republic', false),
    ('TW', 'Taiwan', 'Asia', 'East Asia', 'Taipei', 23800000, 'Unitary semi-presidential republic', true),
    ('MX', 'Mexico', 'Americas', 'Central America', 'Mexico City', 128900000, 'Federal presidential republic', false),
    ('ID', 'Indonesia', 'Asia', 'Southeast Asia', 'Jakarta', 273500000, 'Unitary presidential republic', false),
    ('EG', 'Egypt', 'Africa', 'Northern Africa', 'Cairo', 102300000, 'Unitary semi-presidential republic', false),
    ('ZA', 'South Africa', 'Africa', 'Southern Africa', 'Pretoria', 59300000, 'Unitary parliamentary republic', false),
    ('NG', 'Nigeria', 'Africa', 'Western Africa', 'Abuja', 206000000, 'Federal presidential republic', false),
    ('PK', 'Pakistan', 'Asia', 'South Asia', 'Islamabad', 220900000, 'Federal parliamentary republic', false),
    ('KP', 'North Korea', 'Asia', 'East Asia', 'Pyongyang', 25800000, 'Unitary one-party republic', true),
    ('VE', 'Venezuela', 'Americas', 'South America', 'Caracas', 28400000, 'Federal presidential republic', false),
    ('AF', 'Afghanistan', 'Asia', 'South Asia', 'Kabul', 38900000, 'Unitary provisional Islamic emirate', false),
    ('SY', 'Syria', 'Asia', 'Western Asia', 'Damascus', 17500000, 'Unitary dominant-party semi-presidential republic', false),
    ('YE', 'Yemen', 'Asia', 'Western Asia', 'Sanaa', 29800000, 'Unitary provisional government', false);

-- Market symbols (key indices and assets for geopolitical monitoring)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country) VALUES
    -- Major Indices
    ('SPY', 'S&P 500 ETF', 'index', 'USD', 'NYSE', NULL, 'US'),
    ('QQQ', 'NASDAQ 100 ETF', 'index', 'USD', 'NASDAQ', NULL, 'US'),
    ('DIA', 'Dow Jones ETF', 'index', 'USD', 'NYSE', NULL, 'US'),
    ('EWJ', 'Japan ETF', 'index', 'USD', 'NYSE', NULL, 'JP'),
    ('FXI', 'China Large-Cap ETF', 'index', 'USD', 'NYSE', NULL, 'CN'),
    ('EWG', 'Germany ETF', 'index', 'USD', 'NYSE', NULL, 'DE'),
    ('EWU', 'United Kingdom ETF', 'index', 'USD', 'NYSE', NULL, 'GB'),
    ('RSX', 'Russia ETF', 'index', 'USD', 'NYSE', NULL, 'RU'),
    
    -- Commodities
    ('GLD', 'Gold ETF', 'commodity', 'USD', 'NYSE', 'Precious Metals', NULL),
    ('SLV', 'Silver ETF', 'commodity', 'USD', 'NYSE', 'Precious Metals', NULL),
    ('USO', 'Oil ETF', 'commodity', 'USD', 'NYSE', 'Energy', NULL),
    ('UNG', 'Natural Gas ETF', 'commodity', 'USD', 'NYSE', 'Energy', NULL),
    ('WEAT', 'Wheat ETF', 'commodity', 'USD', 'NYSE', 'Agriculture', NULL),
    ('CORN', 'Corn ETF', 'commodity', 'USD', 'NYSE', 'Agriculture', NULL),
    
    -- Forex
    ('DXY', 'US Dollar Index', 'forex', 'USD', NULL, NULL, NULL),
    ('EURUSD', 'Euro/USD', 'forex', 'USD', NULL, NULL, NULL),
    ('USDJPY', 'USD/Japanese Yen', 'forex', 'JPY', NULL, NULL, NULL),
    ('GBPUSD', 'British Pound/USD', 'forex', 'USD', NULL, NULL, NULL),
    ('USDCNY', 'USD/Chinese Yuan', 'forex', 'CNY', NULL, NULL, NULL),
    ('USDRUB', 'USD/Russian Ruble', 'forex', 'RUB', NULL, NULL, NULL),
    
    -- Volatility
    ('VIX', 'CBOE Volatility Index', 'index', 'USD', 'CBOE', 'Volatility', 'US'),
    
    -- Defense stocks
    ('LMT', 'Lockheed Martin', 'stock', 'USD', 'NYSE', 'Defense', 'US'),
    ('RTX', 'Raytheon Technologies', 'stock', 'USD', 'NYSE', 'Defense', 'US'),
    ('NOC', 'Northrop Grumman', 'stock', 'USD', 'NYSE', 'Defense', 'US'),
    ('BA', 'Boeing', 'stock', 'USD', 'NYSE', 'Aerospace', 'US'),
    
    -- Energy stocks
    ('XOM', 'Exxon Mobil', 'stock', 'USD', 'NYSE', 'Energy', 'US'),
    ('CVX', 'Chevron', 'stock', 'USD', 'NYSE', 'Energy', 'US'),
    ('BP', 'BP plc', 'stock', 'USD', 'NYSE', 'Energy', 'GB'),
    ('SHEL', 'Shell', 'stock', 'USD', 'NYSE', 'Energy', 'NL'),
    
    -- Crypto
    ('BTC-USD', 'Bitcoin', 'crypto', 'USD', NULL, NULL, NULL),
    ('ETH-USD', 'Ethereum', 'crypto', 'USD', NULL, NULL, NULL);

