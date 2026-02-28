-- Expand Media Sources
-- Adds comprehensive international and national media sources by country

-- ============================================
-- MEDIOS INTERNACIONALES (Wire Services)
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Agence France-Presse', 'wire', 'https://www.afp.com/en/rss', 'https://www.afp.com', 'FR', 'en', 85, ARRAY['wire', 'international'], true),
    ('Xinhua News Agency', 'wire', 'http://www.xinhuanet.com/english/rss/worldrss.xml', 'http://www.xinhuanet.com', 'CN', 'en', 70, ARRAY['wire', 'international', 'china'], true),
    ('TASS Russian News', 'wire', 'https://tass.com/rss/v2.xml', 'https://tass.com', 'RU', 'en', 70, ARRAY['wire', 'international', 'russia'], true),
    ('EFE News Agency', 'wire', 'https://www.efe.com/efe/espana/1', 'https://www.efe.com', 'ES', 'es', 80, ARRAY['wire', 'international', 'spanish'], true),
    ('ANSA Italian News', 'wire', 'https://www.ansa.it/sito/notizie/mondo/mondo_rss.xml', 'https://www.ansa.it', 'IT', 'it', 80, ARRAY['wire', 'international', 'italy'], true),
    ('DPA German News', 'wire', 'https://www.dpa.de/rss', 'https://www.dpa.de', 'DE', 'de', 80, ARRAY['wire', 'international', 'germany'], true),
    ('Kyodo News', 'wire', 'https://english.kyodonews.net/rss/news.xml', 'https://english.kyodonews.net', 'JP', 'en', 80, ARRAY['wire', 'international', 'japan'], true),
    ('Yonhap News', 'wire', 'https://en.yna.co.kr/rss/all.xml', 'https://en.yna.co.kr', 'KR', 'en', 80, ARRAY['wire', 'international', 'korea'], true);

-- ============================================
-- ESTADOS UNIDOS
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('The New York Times', 'media', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', 'https://www.nytimes.com', 'US', 'en', 85, ARRAY['media', 'international', 'premium'], true),
    ('The Washington Post', 'media', 'https://feeds.washingtonpost.com/rss/world', 'https://www.washingtonpost.com', 'US', 'en', 85, ARRAY['media', 'international', 'politics'], true),
    ('Wall Street Journal', 'media', 'https://www.wsj.com/xml/rss/3_7085.xml', 'https://www.wsj.com', 'US', 'en', 85, ARRAY['media', 'finance', 'international'], true),
    ('Bloomberg', 'media', 'https://www.bloomberg.com/feed/topics/world', 'https://www.bloomberg.com', 'US', 'en', 85, ARRAY['media', 'finance', 'international'], true),
    ('NPR World', 'media', 'https://feeds.npr.org/1004/rss.xml', 'https://www.npr.org', 'US', 'en', 80, ARRAY['media', 'international'], true),
    ('ABC News World', 'media', 'https://abcnews.go.com/abcnews/internationalheadlines', 'https://abcnews.go.com', 'US', 'en', 75, ARRAY['media', 'international'], true),
    ('CBS News World', 'media', 'https://www.cbsnews.com/latest/rss/world', 'https://www.cbsnews.com', 'US', 'en', 75, ARRAY['media', 'international'], true),
    ('NBC News World', 'media', 'https://feeds.nbcnews.com/nbcnews/public/world', 'https://www.nbcnews.com', 'US', 'en', 75, ARRAY['media', 'international'], true),
    ('USA Today World', 'media', 'https://www.usatoday.com/rss/news/', 'https://www.usatoday.com', 'US', 'en', 75, ARRAY['media', 'international'], true),
    ('Los Angeles Times World', 'media', 'https://www.latimes.com/world/rss2.0.xml', 'https://www.latimes.com', 'US', 'en', 80, ARRAY['media', 'international'], true),
    ('Chicago Tribune World', 'media', 'https://www.chicagotribune.com/news/nationworld/rss2.0.xml', 'https://www.chicagotribune.com', 'US', 'en', 75, ARRAY['media', 'international'], true),
    ('Defense News', 'media', 'https://www.defensenews.com/arc/outboundfeeds/rss/', 'https://www.defensenews.com', 'US', 'en', 80, ARRAY['media', 'defense', 'military'], true),
    ('The Hill', 'media', 'https://thehill.com/rss/syndicator/19110', 'https://thehill.com', 'US', 'en', 75, ARRAY['media', 'politics', 'policy'], true),
    ('Roll Call', 'media', 'https://www.rollcall.com/feed/', 'https://www.rollcall.com', 'US', 'en', 75, ARRAY['media', 'politics', 'congress'], true);

-- ============================================
-- REINO UNIDO
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('The Times', 'media', 'https://www.thetimes.co.uk/rss', 'https://www.thetimes.co.uk', 'GB', 'en', 85, ARRAY['media', 'international', 'premium'], true),
    ('The Telegraph', 'media', 'https://www.telegraph.co.uk/rss.xml', 'https://www.telegraph.co.uk', 'GB', 'en', 85, ARRAY['media', 'international'], true),
    ('The Independent', 'media', 'https://www.independent.co.uk/news/world/rss', 'https://www.independent.co.uk', 'GB', 'en', 80, ARRAY['media', 'international'], true),
    ('Sky News', 'media', 'https://feeds.skynews.com/feeds/rss/world.xml', 'https://news.sky.com', 'GB', 'en', 80, ARRAY['media', 'international'], true),
    ('ITV News', 'media', 'https://www.itv.com/news/feed', 'https://www.itv.com/news', 'GB', 'en', 75, ARRAY['media', 'international'], true),
    ('Channel 4 News', 'media', 'https://www.channel4.com/news/rss', 'https://www.channel4.com/news', 'GB', 'en', 75, ARRAY['media', 'international'], true),
    ('Daily Mail World', 'media', 'https://www.dailymail.co.uk/news/worldnews/index.rss', 'https://www.dailymail.co.uk', 'GB', 'en', 70, ARRAY['media', 'international'], true),
    ('The Sun World', 'media', 'https://www.thesun.co.uk/news/world/feed/', 'https://www.thesun.co.uk', 'GB', 'en', 65, ARRAY['media', 'international'], true);

-- ============================================
-- ESPAÑA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('El País Internacional', 'media', 'https://elpais.com/internacional/rss/', 'https://elpais.com', 'ES', 'es', 85, ARRAY['media', 'international', 'spanish'], true),
    ('El Mundo Internacional', 'media', 'https://www.elmundo.es/internacional.html', 'https://www.elmundo.es', 'ES', 'es', 85, ARRAY['media', 'international', 'spanish'], true),
    ('ABC Internacional', 'media', 'https://www.abc.es/internacional/rss/', 'https://www.abc.es', 'ES', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('La Vanguardia Internacional', 'media', 'https://www.lavanguardia.com/internacional/rss.html', 'https://www.lavanguardia.com', 'ES', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('El Confidencial Internacional', 'media', 'https://www.elconfidencial.com/internacional/rss/', 'https://www.elconfidencial.com', 'ES', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('RTVE Noticias Internacional', 'media', 'https://www.rtve.es/noticias/internacional/rss/', 'https://www.rtve.es', 'ES', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('Cadena SER Internacional', 'media', 'https://cadenaser.com/internacional/rss/', 'https://cadenaser.com', 'ES', 'es', 75, ARRAY['media', 'international', 'spanish'], true),
    ('El Periódico Internacional', 'media', 'https://www.elperiodico.com/es/internacional/rss/', 'https://www.elperiodico.com', 'ES', 'es', 80, ARRAY['media', 'international', 'spanish'], true);

-- ============================================
-- MÉXICO
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('El Universal Internacional', 'media', 'https://www.eluniversal.com.mx/rss.xml', 'https://www.eluniversal.com.mx', 'MX', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('Reforma Internacional', 'media', 'https://www.reforma.com/rss/internacional.xml', 'https://www.reforma.com', 'MX', 'es', 85, ARRAY['media', 'international', 'spanish'], true),
    ('La Jornada Internacional', 'media', 'https://www.jornada.com.mx/rss/internacional.xml', 'https://www.jornada.com.mx', 'MX', 'es', 75, ARRAY['media', 'international', 'spanish'], true),
    ('Milenio Internacional', 'media', 'https://www.milenio.com/rss/internacional.xml', 'https://www.milenio.com', 'MX', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('Excélsior Internacional', 'media', 'https://www.excelsior.com.mx/rss/internacional.xml', 'https://www.excelsior.com.mx', 'MX', 'es', 75, ARRAY['media', 'international', 'spanish'], true),
    ('Proceso Internacional', 'media', 'https://www.proceso.com.mx/rss/internacional.xml', 'https://www.proceso.com.mx', 'MX', 'es', 75, ARRAY['media', 'international', 'spanish'], true);

-- ============================================
-- ARGENTINA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Clarín Internacional', 'media', 'https://www.clarin.com/rss/mundo.html', 'https://www.clarin.com', 'AR', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('La Nación Internacional', 'media', 'https://www.lanacion.com.ar/rss/mundo.xml', 'https://www.lanacion.com.ar', 'AR', 'es', 85, ARRAY['media', 'international', 'spanish'], true),
    ('Página/12 Internacional', 'media', 'https://www.pagina12.com.ar/rss/secciones/el-mundo/notas', 'https://www.pagina12.com.ar', 'AR', 'es', 75, ARRAY['media', 'international', 'spanish'], true),
    ('Infobae Internacional', 'media', 'https://www.infobae.com/feeds/rss/', 'https://www.infobae.com', 'AR', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('Ámbito Internacional', 'media', 'https://www.ambito.com/rss/mundo.xml', 'https://www.ambito.com', 'AR', 'es', 75, ARRAY['media', 'international', 'spanish'], true);

-- ============================================
-- COLOMBIA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('El Tiempo Internacional', 'media', 'https://www.eltiempo.com/rss/mundo.xml', 'https://www.eltiempo.com', 'CO', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('El Espectador Internacional', 'media', 'https://www.elespectador.com/rss/mundo/', 'https://www.elespectador.com', 'CO', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('Semana Internacional', 'media', 'https://www.semana.com/rss/mundo.xml', 'https://www.semana.com', 'CO', 'es', 75, ARRAY['media', 'international', 'spanish'], true),
    ('Portafolio Internacional', 'media', 'https://www.portafolio.co/rss/internacional.xml', 'https://www.portafolio.co', 'CO', 'es', 80, ARRAY['media', 'international', 'finance', 'spanish'], true);

-- ============================================
-- CHILE
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('El Mercurio Internacional', 'media', 'https://www.emol.com/rss/internacional.xml', 'https://www.emol.com', 'CL', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('La Tercera Internacional', 'media', 'https://www.latercera.com/rss/internacional/', 'https://www.latercera.com', 'CL', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('CNN Chile Internacional', 'media', 'https://www.cnnchile.com/rss/internacional.xml', 'https://www.cnnchile.com', 'CL', 'es', 75, ARRAY['media', 'international', 'spanish'], true);

-- ============================================
-- PERÚ
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('El Comercio Internacional', 'media', 'https://elcomercio.pe/rss/mundo/', 'https://elcomercio.pe', 'PE', 'es', 80, ARRAY['media', 'international', 'spanish'], true),
    ('La República Internacional', 'media', 'https://larepublica.pe/rss/mundo/', 'https://larepublica.pe', 'PE', 'es', 75, ARRAY['media', 'international', 'spanish'], true),
    ('Gestión Internacional', 'media', 'https://gestion.pe/rss/mundo/', 'https://gestion.pe', 'PE', 'es', 80, ARRAY['media', 'international', 'finance', 'spanish'], true);

-- ============================================
-- BRASIL
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Folha de S.Paulo Internacional', 'media', 'https://www1.folha.uol.com.br/internacional/rss091.xml', 'https://www1.folha.uol.com.br', 'BR', 'pt', 85, ARRAY['media', 'international', 'portuguese'], true),
    ('O Globo Internacional', 'media', 'https://oglobo.globo.com/rss.xml?secao=mundo', 'https://oglobo.globo.com', 'BR', 'pt', 85, ARRAY['media', 'international', 'portuguese'], true),
    ('Estadão Internacional', 'media', 'https://www.estadao.com.br/rss/internacional.xml', 'https://www.estadao.com.br', 'BR', 'pt', 85, ARRAY['media', 'international', 'portuguese'], true),
    ('Valor Econômico Internacional', 'media', 'https://valor.globo.com/rss/internacional.xml', 'https://valor.globo.com', 'BR', 'pt', 85, ARRAY['media', 'international', 'finance', 'portuguese'], true),
    ('BBC Brasil', 'media', 'https://www.bbc.com/portuguese/rss.xml', 'https://www.bbc.com/portuguese', 'BR', 'pt', 80, ARRAY['media', 'international', 'portuguese'], true);

-- ============================================
-- FRANCIA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Le Monde International', 'media', 'https://www.lemonde.fr/international/rss_full.xml', 'https://www.lemonde.fr', 'FR', 'fr', 85, ARRAY['media', 'international', 'french'], true),
    ('Le Figaro International', 'media', 'https://www.lefigaro.fr/rss/figaro_international.xml', 'https://www.lefigaro.fr', 'FR', 'fr', 85, ARRAY['media', 'international', 'french'], true),
    ('Libération International', 'media', 'https://www.liberation.fr/rss/international/', 'https://www.liberation.fr', 'FR', 'fr', 80, ARRAY['media', 'international', 'french'], true),
    ('L''Express International', 'media', 'https://www.lexpress.fr/rss/international.xml', 'https://www.lexpress.fr', 'FR', 'fr', 80, ARRAY['media', 'international', 'french'], true),
    ('RFI International', 'media', 'https://www.rfi.fr/fr/rss', 'https://www.rfi.fr', 'FR', 'fr', 80, ARRAY['media', 'international', 'french'], true);

-- ============================================
-- ALEMANIA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Der Spiegel International', 'media', 'https://www.spiegel.de/international/index.rss', 'https://www.spiegel.de', 'DE', 'en', 85, ARRAY['media', 'international', 'germany'], true),
    ('Die Zeit International', 'media', 'https://www.zeit.de/international/index', 'https://www.zeit.de', 'DE', 'en', 85, ARRAY['media', 'international', 'germany'], true),
    ('Süddeutsche Zeitung', 'media', 'https://www.sueddeutsche.de/rss', 'https://www.sueddeutsche.de', 'DE', 'de', 85, ARRAY['media', 'international', 'germany'], true),
    ('Frankfurter Allgemeine', 'media', 'https://www.faz.net/rss/aktuell/', 'https://www.faz.net', 'DE', 'de', 85, ARRAY['media', 'international', 'germany'], true),
    ('Die Welt International', 'media', 'https://www.welt.de/international/index.rss', 'https://www.welt.de', 'DE', 'en', 80, ARRAY['media', 'international', 'germany'], true);

-- ============================================
-- ITALIA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Corriere della Sera Internazionale', 'media', 'https://www.corriere.it/rss/esteri.xml', 'https://www.corriere.it', 'IT', 'it', 85, ARRAY['media', 'international', 'italy'], true),
    ('La Repubblica Internazionale', 'media', 'https://www.repubblica.it/rss/esteri/rss2.0.xml', 'https://www.repubblica.it', 'IT', 'it', 85, ARRAY['media', 'international', 'italy'], true),
    ('Il Sole 24 Ore Internazionale', 'media', 'https://www.ilsole24ore.com/rss/esteri.xml', 'https://www.ilsole24ore.com', 'IT', 'it', 85, ARRAY['media', 'international', 'finance', 'italy'], true),
    ('La Stampa Internazionale', 'media', 'https://www.lastampa.it/rss/esteri.xml', 'https://www.lastampa.it', 'IT', 'it', 80, ARRAY['media', 'international', 'italy'], true);

-- ============================================
-- CHINA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('China Daily', 'media', 'https://www.chinadaily.com.cn/rss/world_rss.xml', 'https://www.chinadaily.com.cn', 'CN', 'en', 70, ARRAY['media', 'international', 'china'], true),
    ('Global Times', 'media', 'https://www.globaltimes.cn/rss/world.xml', 'https://www.globaltimes.cn', 'CN', 'en', 70, ARRAY['media', 'international', 'china'], true),
    ('South China Morning Post', 'media', 'https://www.scmp.com/rss/feed', 'https://www.scmp.com', 'HK', 'en', 80, ARRAY['media', 'international', 'asia'], true),
    ('CGTN', 'media', 'https://www.cgtn.com/rss/news', 'https://www.cgtn.com', 'CN', 'en', 70, ARRAY['media', 'international', 'china'], true);

-- ============================================
-- JAPÓN
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('The Japan Times', 'media', 'https://www.japantimes.co.jp/rss/news/', 'https://www.japantimes.co.jp', 'JP', 'en', 85, ARRAY['media', 'international', 'japan'], true),
    ('Nikkei Asia', 'media', 'https://asia.nikkei.com/rss', 'https://asia.nikkei.com', 'JP', 'en', 85, ARRAY['media', 'international', 'asia', 'finance'], true),
    ('Asahi Shimbun International', 'media', 'https://www.asahi.com/ajw/rss/eaj.xml', 'https://www.asahi.com', 'JP', 'en', 85, ARRAY['media', 'international', 'japan'], true),
    ('Mainichi Shimbun', 'media', 'https://mainichi.jp/english/rss/', 'https://mainichi.jp', 'JP', 'en', 85, ARRAY['media', 'international', 'japan'], true),
    ('Yomiuri Shimbun International', 'media', 'https://www.yomiuri.co.jp/rss/news.xml', 'https://www.yomiuri.co.jp', 'JP', 'ja', 85, ARRAY['media', 'international', 'japan'], true);

-- ============================================
-- INDIA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('The Times of India International', 'media', 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms', 'https://timesofindia.indiatimes.com', 'IN', 'en', 80, ARRAY['media', 'international', 'india'], true),
    ('The Hindu International', 'media', 'https://www.thehindu.com/news/international/feeder/default.rss', 'https://www.thehindu.com', 'IN', 'en', 85, ARRAY['media', 'international', 'india'], true),
    ('Hindustan Times International', 'media', 'https://www.hindustantimes.com/rss/world/rssfeed.xml', 'https://www.hindustantimes.com', 'IN', 'en', 80, ARRAY['media', 'international', 'india'], true),
    ('The Indian Express International', 'media', 'https://indianexpress.com/section/world/feed/', 'https://indianexpress.com', 'IN', 'en', 80, ARRAY['media', 'international', 'india'], true),
    ('NDTV World', 'media', 'https://feeds.feedburner.com/ndtv/world-news', 'https://www.ndtv.com', 'IN', 'en', 80, ARRAY['media', 'international', 'india'], true);

-- ============================================
-- COREA DEL SUR
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('The Korea Herald', 'media', 'https://www.koreaherald.com/rss/world.xml', 'https://www.koreaherald.com', 'KR', 'en', 80, ARRAY['media', 'international', 'korea'], true),
    ('The Korea Times', 'media', 'https://www.koreatimes.co.kr/rss/world.xml', 'https://www.koreatimes.co.kr', 'KR', 'en', 80, ARRAY['media', 'international', 'korea'], true),
    ('Chosun Ilbo International', 'media', 'https://english.chosun.com/rss/', 'https://english.chosun.com', 'KR', 'en', 80, ARRAY['media', 'international', 'korea'], true);

-- ============================================
-- RUSIA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('RT International', 'media', 'https://www.rt.com/rss/', 'https://www.rt.com', 'RU', 'en', 60, ARRAY['media', 'international', 'russia'], true),
    ('Sputnik International', 'media', 'https://sputniknews.com/export/rss2/index.xml', 'https://sputniknews.com', 'RU', 'en', 60, ARRAY['media', 'international', 'russia'], true),
    ('Russia Today', 'media', 'https://www.rt.com/rss/', 'https://www.rt.com', 'RU', 'en', 60, ARRAY['media', 'international', 'russia'], true),
    ('Kommersant International', 'media', 'https://www.kommersant.ru/RSS/news.xml', 'https://www.kommersant.ru', 'RU', 'ru', 75, ARRAY['media', 'international', 'russia'], true);

-- ============================================
-- TURQUÍA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Hurriyet Daily News', 'media', 'https://www.hurriyetdailynews.com/rss.aspx', 'https://www.hurriyetdailynews.com', 'TR', 'en', 80, ARRAY['media', 'international', 'turkey'], true),
    ('Daily Sabah', 'media', 'https://www.dailysabah.com/rss', 'https://www.dailysabah.com', 'TR', 'en', 75, ARRAY['media', 'international', 'turkey'], true),
    ('Anadolu Agency', 'wire', 'https://www.aa.com.tr/en/rss/default?cat=world', 'https://www.aa.com.tr', 'TR', 'en', 75, ARRAY['wire', 'international', 'turkey'], true);

-- ============================================
-- ISRAEL
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Haaretz International', 'media', 'https://www.haaretz.com/rss', 'https://www.haaretz.com', 'IL', 'en', 80, ARRAY['media', 'international', 'israel', 'middle-east'], true),
    ('The Jerusalem Post', 'media', 'https://www.jpost.com/Rss/RssFeedsHeadlines.aspx', 'https://www.jpost.com', 'IL', 'en', 80, ARRAY['media', 'international', 'israel', 'middle-east'], true),
    ('Times of Israel', 'media', 'https://www.timesofisrael.com/feed/', 'https://www.timesofisrael.com', 'IL', 'en', 75, ARRAY['media', 'international', 'israel', 'middle-east'], true);

-- ============================================
-- ARABIA SAUDÍ
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Arab News', 'media', 'https://www.arabnews.com/rss.xml', 'https://www.arabnews.com', 'SA', 'en', 75, ARRAY['media', 'international', 'saudi', 'middle-east'], true),
    ('Saudi Gazette', 'media', 'https://saudigazette.com.sa/rss/', 'https://saudigazette.com.sa', 'SA', 'en', 75, ARRAY['media', 'international', 'saudi', 'middle-east'], true);

-- ============================================
-- IRÁN
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Press TV', 'media', 'https://www.presstv.com/rss', 'https://www.presstv.com', 'IR', 'en', 60, ARRAY['media', 'international', 'iran', 'middle-east'], true),
    ('Tehran Times', 'media', 'https://www.tehrantimes.com/rss', 'https://www.tehrantimes.com', 'IR', 'en', 65, ARRAY['media', 'international', 'iran', 'middle-east'], true);

-- ============================================
-- EGIPTO
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Al-Ahram International', 'media', 'https://english.ahram.org.eg/rss.aspx', 'https://english.ahram.org.eg', 'EG', 'en', 75, ARRAY['media', 'international', 'egypt', 'middle-east'], true),
    ('Daily News Egypt', 'media', 'https://www.dailynewsegypt.com/feed/', 'https://www.dailynewsegypt.com', 'EG', 'en', 75, ARRAY['media', 'international', 'egypt', 'middle-east'], true);

-- ============================================
-- SUDÁFRICA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Mail & Guardian', 'media', 'https://mg.co.za/rss/', 'https://mg.co.za', 'ZA', 'en', 80, ARRAY['media', 'international', 'south-africa'], true),
    ('Business Day', 'media', 'https://www.businesslive.co.za/rss/', 'https://www.businesslive.co.za', 'ZA', 'en', 80, ARRAY['media', 'international', 'finance', 'south-africa'], true),
    ('News24', 'media', 'https://www.news24.com/rss/', 'https://www.news24.com', 'ZA', 'en', 75, ARRAY['media', 'international', 'south-africa'], true);

-- ============================================
-- NIGERIA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Premium Times', 'media', 'https://www.premiumtimesng.com/rss', 'https://www.premiumtimesng.com', 'NG', 'en', 80, ARRAY['media', 'international', 'nigeria'], true),
    ('The Guardian Nigeria', 'media', 'https://guardian.ng/rss/', 'https://guardian.ng', 'NG', 'en', 80, ARRAY['media', 'international', 'nigeria'], true),
    ('Vanguard', 'media', 'https://www.vanguardngr.com/rss/', 'https://www.vanguardngr.com', 'NG', 'en', 75, ARRAY['media', 'international', 'nigeria'], true);

-- ============================================
-- AUSTRALIA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('The Australian International', 'media', 'https://www.theaustralian.com.au/rss', 'https://www.theaustralian.com.au', 'AU', 'en', 85, ARRAY['media', 'international', 'australia'], true),
    ('Sydney Morning Herald International', 'media', 'https://www.smh.com.au/rss/world.xml', 'https://www.smh.com.au', 'AU', 'en', 85, ARRAY['media', 'international', 'australia'], true),
    ('ABC News Australia', 'media', 'https://www.abc.net.au/news/feed/45910/rss.xml', 'https://www.abc.net.au', 'AU', 'en', 80, ARRAY['media', 'international', 'australia'], true);

-- ============================================
-- CANADÁ
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('The Globe and Mail International', 'media', 'https://www.theglobeandmail.com/world/rss/', 'https://www.theglobeandmail.com', 'CA', 'en', 85, ARRAY['media', 'international', 'canada'], true),
    ('CBC News World', 'media', 'https://www.cbc.ca/cmlink/rss-world', 'https://www.cbc.ca', 'CA', 'en', 80, ARRAY['media', 'international', 'canada'], true),
    ('National Post International', 'media', 'https://nationalpost.com/feed/world', 'https://nationalpost.com', 'CA', 'en', 80, ARRAY['media', 'international', 'canada'], true);

-- ============================================
-- ASIA-PACÍFICO
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('The Straits Times', 'media', 'https://www.straitstimes.com/rss', 'https://www.straitstimes.com', 'SG', 'en', 85, ARRAY['media', 'international', 'asia', 'singapore'], true),
    ('Channel NewsAsia', 'media', 'https://www.channelnewsasia.com/rssfeeds/8395986', 'https://www.channelnewsasia.com', 'SG', 'en', 85, ARRAY['media', 'international', 'asia', 'singapore'], true),
    ('Bangkok Post', 'media', 'https://www.bangkokpost.com/rss/data/world.xml', 'https://www.bangkokpost.com', 'TH', 'en', 80, ARRAY['media', 'international', 'asia', 'thailand'], true),
    ('The Jakarta Post', 'media', 'https://www.thejakartapost.com/rss', 'https://www.thejakartapost.com', 'ID', 'en', 80, ARRAY['media', 'international', 'asia', 'indonesia'], true),
    ('The Philippine Star', 'media', 'https://www.philstar.com/rss/world', 'https://www.philstar.com', 'PH', 'en', 75, ARRAY['media', 'international', 'asia', 'philippines'], true),
    ('Vietnam News', 'media', 'https://vietnamnews.vn/rss/', 'https://vietnamnews.vn', 'VN', 'en', 75, ARRAY['media', 'international', 'asia', 'vietnam'], true);

-- ============================================
-- MEDIOS ESPECIALIZADOS EN GEOPOLÍTICA
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('The National Interest', 'think-tank', 'https://nationalinterest.org/feed', 'https://nationalinterest.org', 'US', 'en', 80, ARRAY['think-tank', 'geopolitics', 'analysis'], true),
    ('RealClearWorld', 'media', 'https://www.realclearworld.com/rss.xml', 'https://www.realclearworld.com', 'US', 'en', 80, ARRAY['media', 'geopolitics', 'analysis'], true),
    ('World Politics Review', 'media', 'https://www.worldpoliticsreview.com/rss', 'https://www.worldpoliticsreview.com', 'US', 'en', 85, ARRAY['media', 'geopolitics', 'analysis'], true),
    ('Geopolitical Monitor', 'think-tank', 'https://www.geopoliticalmonitor.com/feed/', 'https://www.geopoliticalmonitor.com', 'CA', 'en', 80, ARRAY['think-tank', 'geopolitics', 'analysis'], true),
    ('Eurasia Review', 'media', 'https://www.eurasiareview.com/feed/', 'https://www.eurasiareview.com', 'US', 'en', 75, ARRAY['media', 'geopolitics', 'analysis'], true),
    ('Asia Times', 'media', 'https://asiatimes.com/feed/', 'https://asiatimes.com', 'HK', 'en', 75, ARRAY['media', 'geopolitics', 'asia', 'analysis'], true),
    ('Middle East Eye', 'media', 'https://www.middleeasteye.net/rss.xml', 'https://www.middleeasteye.net', 'GB', 'en', 75, ARRAY['media', 'middle-east', 'analysis'], true),
    ('Al-Monitor', 'media', 'https://www.al-monitor.com/rss', 'https://www.al-monitor.com', 'US', 'en', 80, ARRAY['media', 'middle-east', 'analysis'], true);

-- ============================================
-- ORGANIZACIONES INTERNACIONALES
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('EU Observer', 'official', 'https://euobserver.com/rss', 'https://euobserver.com', 'EU', 'en', 80, ARRAY['official', 'europe', 'eu'], true),
    ('Politico Europe', 'media', 'https://www.politico.eu/feed/', 'https://www.politico.eu', 'EU', 'en', 85, ARRAY['media', 'europe', 'eu', 'politics'], true),
    ('Euronews', 'media', 'https://www.euronews.com/rss?format=mrss', 'https://www.euronews.com', 'EU', 'en', 80, ARRAY['media', 'europe', 'eu'], true),
    ('NATO News', 'official', 'https://www.nato.int/cps/en/natohq/news.rss', 'https://www.nato.int', 'INT', 'en', 85, ARRAY['official', 'defense', 'nato'], true),
    ('World Bank News', 'official', 'https://www.worldbank.org/en/news/rss', 'https://www.worldbank.org', 'INT', 'en', 85, ARRAY['official', 'economics', 'development'], true),
    ('IMF News', 'official', 'https://www.imf.org/en/News/rss', 'https://www.imf.org', 'INT', 'en', 85, ARRAY['official', 'economics', 'finance'], true),
    ('WTO News', 'official', 'https://www.wto.org/english/news_e/rss_e/rss_e.htm', 'https://www.wto.org', 'INT', 'en', 85, ARRAY['official', 'trade', 'economics'], true),
    ('Crisis Group', 'think-tank', 'https://www.crisisgroup.org/rss', 'https://www.crisisgroup.org', 'INT', 'en', 90, ARRAY['think-tank', 'conflict', 'crisis'], true);

-- ============================================
-- MEDIOS DE ENERGÍA Y RECURSOS
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Oil & Gas Journal', 'media', 'https://www.ogj.com/rss-feeds.html', 'https://www.ogj.com', 'US', 'en', 80, ARRAY['media', 'energy', 'oil', 'gas'], true),
    ('Energy Central', 'media', 'https://energycentral.com/rss.xml', 'https://energycentral.com', 'US', 'en', 75, ARRAY['media', 'energy'], true),
    ('Platts', 'media', 'https://www.spglobal.com/platts/en/rss', 'https://www.spglobal.com/platts', 'US', 'en', 85, ARRAY['media', 'energy', 'commodities'], true),
    ('Argus Media', 'media', 'https://www.argusmedia.com/en/rss', 'https://www.argusmedia.com', 'GB', 'en', 85, ARRAY['media', 'energy', 'commodities'], true);

-- ============================================
-- MEDIOS DE DEFENSA Y SEGURIDAD
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('Janes', 'media', 'https://www.janes.com/rss', 'https://www.janes.com', 'GB', 'en', 90, ARRAY['media', 'defense', 'military', 'intelligence'], true),
    ('Breaking Defense', 'media', 'https://breakingdefense.com/feed/', 'https://breakingdefense.com', 'US', 'en', 85, ARRAY['media', 'defense', 'military'], true),
    ('The War Zone', 'media', 'https://www.thedrive.com/the-war-zone/rss', 'https://www.thedrive.com/the-war-zone', 'US', 'en', 80, ARRAY['media', 'defense', 'military'], true),
    ('Defense One', 'media', 'https://www.defenseone.com/feed/', 'https://www.defenseone.com', 'US', 'en', 85, ARRAY['media', 'defense', 'policy'], true);

-- ============================================
-- MEDIOS ECONÓMICOS Y FINANCIEROS
-- ============================================
INSERT INTO sources (name, type, rss_url, website_url, country, language, reputation_base, tags, enabled) VALUES
    ('MarketWatch World', 'media', 'https://www.marketwatch.com/rss/topstories', 'https://www.marketwatch.com', 'US', 'en', 80, ARRAY['media', 'finance', 'markets'], true),
    ('CNBC World', 'media', 'https://www.cnbc.com/id/100727362/device/rss/rss.html', 'https://www.cnbc.com', 'US', 'en', 80, ARRAY['media', 'finance', 'markets'], true),
    ('Reuters Business', 'media', 'https://www.reuters.com/rssFeed/businessNews', 'https://www.reuters.com', 'GB', 'en', 85, ARRAY['media', 'finance', 'business'], true),
    ('AP Business', 'wire', 'https://apnews.com/apf-business', 'https://apnews.com', 'US', 'en', 85, ARRAY['wire', 'finance', 'business'], true);

-- Note: Some RSS URLs may need verification as they can change over time
-- The system will handle invalid URLs gracefully during ingestion
