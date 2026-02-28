-- Importación masiva de símbolos de mercado importantes para análisis geopolítico
-- Estos símbolos representan activos clave que funcionan como sensores geopolíticos
-- Usa ON CONFLICT para evitar duplicados con 003_seed_data.sql

-- Stocks - Energía (crítico para geopolítica)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('XOM', 'Exxon Mobil Corporation', 'stock', 'USD', 'NYSE', 'Energy', 'US', true),
('CVX', 'Chevron Corporation', 'stock', 'USD', 'NYSE', 'Energy', 'US', true),
('SLB', 'Schlumberger Limited', 'stock', 'USD', 'NYSE', 'Energy', 'US', true),
('COP', 'ConocoPhillips', 'stock', 'USD', 'NYSE', 'Energy', 'US', true),
('EOG', 'EOG Resources Inc', 'stock', 'USD', 'NYSE', 'Energy', 'US', true),
('BP', 'BP p.l.c.', 'stock', 'USD', 'NYSE', 'Energy', 'GB', true),
('SHEL', 'Shell plc', 'stock', 'USD', 'NYSE', 'Energy', 'GB', true),
('TTE', 'TotalEnergies SE', 'stock', 'USD', 'NYSE', 'Energy', 'FR', true),
('EQNR', 'Equinor ASA', 'stock', 'USD', 'NYSE', 'Energy', 'NO', true),
('RDS-A', 'Royal Dutch Shell', 'stock', 'USD', 'NYSE', 'Energy', 'NL', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Defensa y Aeroespacial
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('LMT', 'Lockheed Martin Corporation', 'stock', 'USD', 'NYSE', 'Aerospace & Defense', 'US', true),
('RTX', 'RTX Corporation', 'stock', 'USD', 'NYSE', 'Aerospace & Defense', 'US', true),
('BA', 'The Boeing Company', 'stock', 'USD', 'NYSE', 'Aerospace & Defense', 'US', true),
('NOC', 'Northrop Grumman Corporation', 'stock', 'USD', 'NYSE', 'Aerospace & Defense', 'US', true),
('GD', 'General Dynamics Corporation', 'stock', 'USD', 'NYSE', 'Aerospace & Defense', 'US', true),
('HWM', 'Howmet Aerospace Inc', 'stock', 'USD', 'NYSE', 'Aerospace & Defense', 'US', true),
('TDG', 'TransDigm Group Incorporated', 'stock', 'USD', 'NYSE', 'Aerospace & Defense', 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Tecnología (geopolíticamente sensibles)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('AAPL', 'Apple Inc', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true),
('MSFT', 'Microsoft Corporation', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true),
('GOOGL', 'Alphabet Inc', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true),
('AMZN', 'Amazon.com Inc', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true),
('NVDA', 'NVIDIA Corporation', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true),
('META', 'Meta Platforms Inc', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true),
('TSM', 'Taiwan Semiconductor Manufacturing', 'stock', 'USD', 'NYSE', 'Technology', 'TW', true),
('ASML', 'ASML Holding N.V.', 'stock', 'USD', 'NASDAQ', 'Technology', 'NL', true),
('INTC', 'Intel Corporation', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true),
('AMD', 'Advanced Micro Devices Inc', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Minería y Metales (críticos para geopolítica)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('FCX', 'Freeport-McMoRan Inc', 'stock', 'USD', 'NYSE', 'Materials', 'US', true),
('NEM', 'Newmont Corporation', 'stock', 'USD', 'NYSE', 'Materials', 'US', true),
('GOLD', 'Barrick Gold Corporation', 'stock', 'USD', 'NYSE', 'Materials', 'CA', true),
('RIO', 'Rio Tinto Group', 'stock', 'USD', 'NYSE', 'Materials', 'GB', true),
('BHP', 'BHP Group Limited', 'stock', 'USD', 'NYSE', 'Materials', 'AU', true),
('VALE', 'Vale S.A.', 'stock', 'USD', 'NYSE', 'Materials', 'BR', true),
('GLNCY', 'Glencore plc', 'stock', 'USD', 'OTC', 'Materials', 'CH', true),
('AA', 'Alcoa Corporation', 'stock', 'USD', 'NYSE', 'Materials', 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Agricultura y Alimentos
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('ADM', 'Archer-Daniels-Midland Company', 'stock', 'USD', 'NYSE', 'Consumer Staples', 'US', true),
('BG', 'Bunge Limited', 'stock', 'USD', 'NYSE', 'Consumer Staples', 'US', true),
('DE', 'Deere & Company', 'stock', 'USD', 'NYSE', 'Industrials', 'US', true),
('CTVA', 'Corteva Inc', 'stock', 'USD', 'NYSE', 'Materials', 'US', true),
('MOS', 'The Mosaic Company', 'stock', 'USD', 'NYSE', 'Materials', 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Financieros (sensores de riesgo)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('JPM', 'JPMorgan Chase & Co', 'stock', 'USD', 'NYSE', 'Financials', 'US', true),
('BAC', 'Bank of America Corp', 'stock', 'USD', 'NYSE', 'Financials', 'US', true),
('WFC', 'Wells Fargo & Company', 'stock', 'USD', 'NYSE', 'Financials', 'US', true),
('GS', 'The Goldman Sachs Group Inc', 'stock', 'USD', 'NYSE', 'Financials', 'US', true),
('MS', 'Morgan Stanley', 'stock', 'USD', 'NYSE', 'Financials', 'US', true),
('C', 'Citigroup Inc', 'stock', 'USD', 'NYSE', 'Financials', 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - China (importante geopolíticamente)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('BABA', 'Alibaba Group Holding Limited', 'stock', 'USD', 'NYSE', 'Technology', 'CN', true),
('JD', 'JD.com Inc', 'stock', 'USD', 'NASDAQ', 'Consumer Discretionary', 'CN', true),
('PDD', 'PDD Holdings Inc', 'stock', 'USD', 'NASDAQ', 'Consumer Discretionary', 'CN', true),
('NIO', 'NIO Inc', 'stock', 'USD', 'NYSE', 'Consumer Discretionary', 'CN', true),
('XPEV', 'XPeng Inc', 'stock', 'USD', 'NYSE', 'Consumer Discretionary', 'CN', true),
('LI', 'Li Auto Inc', 'stock', 'USD', 'NASDAQ', 'Consumer Discretionary', 'CN', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Rusia/Europa del Este (cuando disponibles)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('GAZP.ME', 'Gazprom PJSC', 'stock', 'RUB', 'MOEX', 'Energy', 'RU', true),
('LKOH.ME', 'Lukoil PJSC', 'stock', 'RUB', 'MOEX', 'Energy', 'RU', true),
('SBER.ME', 'Sberbank of Russia', 'stock', 'RUB', 'MOEX', 'Financials', 'RU', true)
ON CONFLICT (symbol) DO NOTHING;

-- Índices principales
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('SPY', 'SPDR S&P 500 ETF Trust', 'index', 'USD', 'NYSE', NULL, 'US', true),
('QQQ', 'Invesco QQQ Trust', 'index', 'USD', 'NASDAQ', NULL, 'US', true),
('DIA', 'SPDR Dow Jones Industrial Average ETF', 'index', 'USD', 'NYSE', NULL, 'US', true),
('IWM', 'iShares Russell 2000 ETF', 'index', 'USD', 'NYSE', NULL, 'US', true),
('VTI', 'Vanguard Total Stock Market ETF', 'index', 'USD', 'NYSE', NULL, 'US', true),
('^GSPC', 'S&P 500 Index', 'index', 'USD', 'INDEX', NULL, 'US', true),
('^DJI', 'Dow Jones Industrial Average', 'index', 'USD', 'INDEX', NULL, 'US', true),
('^IXIC', 'NASDAQ Composite', 'index', 'USD', 'INDEX', NULL, 'US', true),
('^VIX', 'CBOE Volatility Index', 'index', 'USD', 'INDEX', NULL, 'US', true),
('^TNX', '10-Year Treasury Note', 'index', 'USD', 'INDEX', NULL, 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Índices internacionales
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('EWZ', 'iShares MSCI Brazil ETF', 'index', 'USD', 'NYSE', NULL, 'BR', true),
('FXI', 'iShares China Large-Cap ETF', 'index', 'USD', 'NYSE', NULL, 'CN', true),
('EWJ', 'iShares MSCI Japan ETF', 'index', 'USD', 'NYSE', NULL, 'JP', true),
('EWU', 'iShares MSCI United Kingdom ETF', 'index', 'USD', 'NYSE', NULL, 'GB', true),
('EWG', 'iShares MSCI Germany ETF', 'index', 'USD', 'NYSE', NULL, 'DE', true),
('EWY', 'iShares MSCI South Korea ETF', 'index', 'USD', 'NYSE', NULL, 'KR', true),
('EWT', 'iShares MSCI Taiwan ETF', 'index', 'USD', 'NYSE', NULL, 'TW', true),
('RSX', 'VanEck Russia ETF', 'index', 'USD', 'NYSE', NULL, 'RU', true)
ON CONFLICT (symbol) DO NOTHING;

-- Commodities - Energía
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('CL=F', 'Crude Oil WTI Futures', 'commodity', 'USD', 'NYMEX', 'Energy', NULL, true),
('BZ=F', 'Brent Crude Oil Futures', 'commodity', 'USD', 'ICE', 'Energy', NULL, true),
('NG=F', 'Natural Gas Futures', 'commodity', 'USD', 'NYMEX', 'Energy', NULL, true),
('RB=F', 'RBOB Gasoline Futures', 'commodity', 'USD', 'NYMEX', 'Energy', NULL, true),
('HO=F', 'Heating Oil Futures', 'commodity', 'USD', 'NYMEX', 'Energy', NULL, true)
ON CONFLICT (symbol) DO NOTHING;

-- Commodities - Metales preciosos
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('GC=F', 'Gold Futures', 'commodity', 'USD', 'COMEX', 'Materials', NULL, true),
('SI=F', 'Silver Futures', 'commodity', 'USD', 'COMEX', 'Materials', NULL, true),
('PL=F', 'Platinum Futures', 'commodity', 'USD', 'NYMEX', 'Materials', NULL, true),
('PA=F', 'Palladium Futures', 'commodity', 'USD', 'NYMEX', 'Materials', NULL, true)
ON CONFLICT (symbol) DO NOTHING;

-- Commodities - Metales industriales
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('HG=F', 'Copper Futures', 'commodity', 'USD', 'COMEX', 'Materials', NULL, true),
('ZC=F', 'Corn Futures', 'commodity', 'USD', 'CBOT', 'Agriculture', NULL, true),
('ZS=F', 'Soybean Futures', 'commodity', 'USD', 'CBOT', 'Agriculture', NULL, true),
('ZW=F', 'Wheat Futures', 'commodity', 'USD', 'CBOT', 'Agriculture', NULL, true),
('KC=F', 'Coffee Futures', 'commodity', 'USD', 'ICE', 'Agriculture', NULL, true),
('SB=F', 'Sugar Futures', 'commodity', 'USD', 'ICE', 'Agriculture', NULL, true)
ON CONFLICT (symbol) DO NOTHING;

-- Forex - Principales pares
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('EURUSD=X', 'Euro / US Dollar', 'forex', 'USD', 'FOREX', NULL, NULL, true),
('GBPUSD=X', 'British Pound / US Dollar', 'forex', 'USD', 'FOREX', NULL, NULL, true),
('USDJPY=X', 'US Dollar / Japanese Yen', 'forex', 'USD', 'FOREX', NULL, NULL, true),
('USDCHF=X', 'US Dollar / Swiss Franc', 'forex', 'USD', 'FOREX', NULL, NULL, true),
('AUDUSD=X', 'Australian Dollar / US Dollar', 'forex', 'USD', 'FOREX', NULL, NULL, true),
('USDCAD=X', 'US Dollar / Canadian Dollar', 'forex', 'USD', 'FOREX', NULL, NULL, true),
('NZDUSD=X', 'New Zealand Dollar / US Dollar', 'forex', 'USD', 'FOREX', NULL, NULL, true),
('USDCNY=X', 'US Dollar / Chinese Yuan', 'forex', 'USD', 'FOREX', NULL, NULL, true),
('USDINR=X', 'US Dollar / Indian Rupee', 'forex', 'USD', 'FOREX', NULL, NULL, true),
('USDRUB=X', 'US Dollar / Russian Ruble', 'forex', 'USD', 'FOREX', NULL, NULL, true),
('USDBRL=X', 'US Dollar / Brazilian Real', 'forex', 'USD', 'FOREX', NULL, NULL, true),
('USDZAR=X', 'US Dollar / South African Rand', 'forex', 'USD', 'FOREX', NULL, NULL, true),
('EURGBP=X', 'Euro / British Pound', 'forex', 'EUR', 'FOREX', NULL, NULL, true),
('EURJPY=X', 'Euro / Japanese Yen', 'forex', 'EUR', 'FOREX', NULL, NULL, true),
('GBPJPY=X', 'British Pound / Japanese Yen', 'forex', 'GBP', 'FOREX', NULL, NULL, true)
ON CONFLICT (symbol) DO NOTHING;

-- Crypto - Principales
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('BTC-USD', 'Bitcoin', 'crypto', 'USD', 'CRYPTO', NULL, NULL, true),
('ETH-USD', 'Ethereum', 'crypto', 'USD', 'CRYPTO', NULL, NULL, true),
('BNB-USD', 'Binance Coin', 'crypto', 'USD', 'CRYPTO', NULL, NULL, true),
('SOL-USD', 'Solana', 'crypto', 'USD', 'CRYPTO', NULL, NULL, true),
('ADA-USD', 'Cardano', 'crypto', 'USD', 'CRYPTO', NULL, NULL, true),
('XRP-USD', 'Ripple', 'crypto', 'USD', 'CRYPTO', NULL, NULL, true),
('DOGE-USD', 'Dogecoin', 'crypto', 'USD', 'CRYPTO', NULL, NULL, true),
('DOT-USD', 'Polkadot', 'crypto', 'USD', 'CRYPTO', NULL, NULL, true),
('MATIC-USD', 'Polygon', 'crypto', 'USD', 'CRYPTO', NULL, NULL, true),
('AVAX-USD', 'Avalanche', 'crypto', 'USD', 'CRYPTO', NULL, NULL, true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Infraestructura crítica
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('CAT', 'Caterpillar Inc', 'stock', 'USD', 'NYSE', 'Industrials', 'US', true),
('DE', 'Deere & Company', 'stock', 'USD', 'NYSE', 'Industrials', 'US', true),
('HON', 'Honeywell International Inc', 'stock', 'USD', 'NASDAQ', 'Industrials', 'US', true),
('GE', 'General Electric Company', 'stock', 'USD', 'NYSE', 'Industrials', 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Telecomunicaciones (infraestructura crítica)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('VZ', 'Verizon Communications Inc', 'stock', 'USD', 'NYSE', 'Telecommunications', 'US', true),
('T', 'AT&T Inc', 'stock', 'USD', 'NYSE', 'Telecommunications', 'US', true),
('TMUS', 'T-Mobile US Inc', 'stock', 'USD', 'NASDAQ', 'Telecommunications', 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Semiconductores (críticos para geopolítica)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('QCOM', 'QUALCOMM Incorporated', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true),
('TXN', 'Texas Instruments Incorporated', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true),
('AVGO', 'Broadcom Inc', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true),
('MU', 'Micron Technology Inc', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true),
('LRCX', 'Lam Research Corporation', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true),
('KLAC', 'KLA Corporation', 'stock', 'USD', 'NASDAQ', 'Technology', 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Farmacéuticas (geopolíticamente relevantes)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('JNJ', 'Johnson & Johnson', 'stock', 'USD', 'NYSE', 'Healthcare', 'US', true),
('PFE', 'Pfizer Inc', 'stock', 'USD', 'NYSE', 'Healthcare', 'US', true),
('MRK', 'Merck & Co Inc', 'stock', 'USD', 'NYSE', 'Healthcare', 'US', true),
('ABBV', 'AbbVie Inc', 'stock', 'USD', 'NYSE', 'Healthcare', 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Transporte (sensores de actividad económica)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('UPS', 'United Parcel Service Inc', 'stock', 'USD', 'NYSE', 'Industrials', 'US', true),
('FDX', 'FedEx Corporation', 'stock', 'USD', 'NYSE', 'Industrials', 'US', true),
('DAL', 'Delta Air Lines Inc', 'stock', 'USD', 'NYSE', 'Industrials', 'US', true),
('UAL', 'United Airlines Holdings Inc', 'stock', 'USD', 'NASDAQ', 'Industrials', 'US', true),
('LUV', 'Southwest Airlines Co', 'stock', 'USD', 'NYSE', 'Industrials', 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Retail (sensores de consumo)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('WMT', 'Walmart Inc', 'stock', 'USD', 'NYSE', 'Consumer Staples', 'US', true),
('TGT', 'Target Corporation', 'stock', 'USD', 'NYSE', 'Consumer Staples', 'US', true),
('HD', 'The Home Depot Inc', 'stock', 'USD', 'NYSE', 'Consumer Discretionary', 'US', true),
('LOW', 'Lowe''s Companies Inc', 'stock', 'USD', 'NYSE', 'Consumer Discretionary', 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Stocks - Utilities (infraestructura crítica)
INSERT INTO market_symbols (symbol, name, type, currency, exchange, sector, country, is_active) VALUES
('NEE', 'NextEra Energy Inc', 'stock', 'USD', 'NYSE', 'Utilities', 'US', true),
('DUK', 'Duke Energy Corporation', 'stock', 'USD', 'NYSE', 'Utilities', 'US', true),
('SO', 'The Southern Company', 'stock', 'USD', 'NYSE', 'Utilities', 'US', true),
('AEP', 'American Electric Power Company Inc', 'stock', 'USD', 'NASDAQ', 'Utilities', 'US', true)
ON CONFLICT (symbol) DO NOTHING;

-- Actualizar timestamps
UPDATE market_symbols SET updated_at = NOW() WHERE is_active = true;

