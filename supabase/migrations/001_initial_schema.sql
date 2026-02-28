-- Intel Desk Database Schema
-- Initial migration: Core tables and RLS policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'reader');
CREATE TYPE source_type AS ENUM ('media', 'official', 'wire', 'think-tank', 'sensor');
CREATE TYPE hypothesis_status AS ENUM ('active', 'confirmed', 'falsified', 'archived');
CREATE TYPE alert_type AS ENUM ('threshold', 'volume', 'correlation', 'event');
CREATE TYPE node_type AS ENUM ('event', 'mechanism', 'variable', 'actor', 'outcome');
CREATE TYPE edge_type AS ENUM ('causes', 'correlates', 'triggers', 'constrains');
CREATE TYPE playbook_actor AS ENUM ('company', 'investor', 'individual', 'government');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'reader',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sources table
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type source_type NOT NULL,
    rss_url TEXT,
    website_url TEXT,
    country TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    reputation_base INTEGER NOT NULL DEFAULT 50 CHECK (reputation_base >= 0 AND reputation_base <= 100),
    enabled BOOLEAN NOT NULL DEFAULT true,
    tags TEXT[] NOT NULL DEFAULT '{}',
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Articles table
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    domain TEXT NOT NULL,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    snippet TEXT,
    full_content TEXT,
    content_hash TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    countries TEXT[] NOT NULL DEFAULT '{}',
    topics TEXT[] NOT NULL DEFAULT '{}',
    entities JSONB NOT NULL DEFAULT '{}',
    computed_score INTEGER,
    cluster_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for deduplication
CREATE INDEX idx_articles_canonical_url ON articles(canonical_url);
CREATE INDEX idx_articles_content_hash ON articles(content_hash);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_cluster_id ON articles(cluster_id);

-- Clusters table
CREATE TABLE clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_title TEXT NOT NULL,
    summary TEXT,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    countries TEXT[] NOT NULL DEFAULT '{}',
    topics TEXT[] NOT NULL DEFAULT '{}',
    entities JSONB NOT NULL DEFAULT '{}',
    severity INTEGER NOT NULL DEFAULT 50 CHECK (severity >= 0 AND severity <= 100),
    confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
    article_count INTEGER NOT NULL DEFAULT 0,
    source_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key for articles.cluster_id
ALTER TABLE articles ADD CONSTRAINT fk_articles_cluster 
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE SET NULL;

CREATE INDEX idx_clusters_updated_at ON clusters(updated_at DESC);
CREATE INDEX idx_clusters_severity ON clusters(severity DESC);
CREATE INDEX idx_clusters_countries ON clusters USING GIN(countries);
CREATE INDEX idx_clusters_topics ON clusters USING GIN(topics);

-- Countries table
CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    subregion TEXT,
    capital TEXT,
    population BIGINT,
    gdp_usd NUMERIC,
    government_type TEXT,
    leader_name TEXT,
    leader_title TEXT,
    overview TEXT,
    drivers JSONB NOT NULL DEFAULT '[]',
    watchlist BOOLEAN NOT NULL DEFAULT false,
    geo_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_countries_code ON countries(code);
CREATE INDEX idx_countries_watchlist ON countries(watchlist) WHERE watchlist = true;

-- Hypotheses table
CREATE TABLE hypotheses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    statement TEXT NOT NULL,
    prob_initial INTEGER NOT NULL CHECK (prob_initial >= 0 AND prob_initial <= 100),
    prob_current INTEGER NOT NULL CHECK (prob_current >= 0 AND prob_current <= 100),
    assumptions JSONB NOT NULL DEFAULT '[]',
    confirm_signals JSONB NOT NULL DEFAULT '[]',
    falsify_signals JSONB NOT NULL DEFAULT '[]',
    red_team_analysis TEXT,
    premortem_analysis TEXT,
    next_review_at TIMESTAMPTZ,
    status hypothesis_status NOT NULL DEFAULT 'active',
    linked_cluster_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hypotheses_user_id ON hypotheses(user_id);
CREATE INDEX idx_hypotheses_status ON hypotheses(status);

-- Hypothesis revisions table
CREATE TABLE hypothesis_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hypothesis_id UUID NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    prob_before INTEGER NOT NULL,
    prob_after INTEGER NOT NULL,
    rationale TEXT NOT NULL,
    evidence_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hypothesis_revisions_hypothesis_id ON hypothesis_revisions(hypothesis_id);

-- Playbooks table
CREATE TABLE playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    actor_type playbook_actor NOT NULL,
    objective TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    tradeoffs TEXT,
    triggers JSONB NOT NULL DEFAULT '[]',
    type_i_cost TEXT,
    type_ii_cost TEXT,
    checklist JSONB NOT NULL DEFAULT '[]',
    response_72h TEXT,
    linked_hypothesis_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playbooks_user_id ON playbooks(user_id);

-- Causal graphs table
CREATE TABLE causal_graphs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    linked_cluster_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_causal_graphs_user_id ON causal_graphs(user_id);

-- Briefings table
CREATE TABLE briefings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    items JSONB NOT NULL DEFAULT '[]',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_briefings_date ON briefings(date DESC);

-- Briefing interactions table
CREATE TABLE briefing_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    briefing_id UUID NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
    item_index INTEGER NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('pin', 'hide', 'read')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (briefing_id, item_index, user_id, action)
);

-- Market symbols table
CREATE TABLE market_symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('stock', 'index', 'forex', 'commodity', 'crypto')),
    currency TEXT NOT NULL DEFAULT 'USD',
    exchange TEXT,
    sector TEXT,
    country TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_symbols_symbol ON market_symbols(symbol);
CREATE INDEX idx_market_symbols_type ON market_symbols(type);

-- Market quotes table
CREATE TABLE market_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol_id UUID NOT NULL REFERENCES market_symbols(id) ON DELETE CASCADE,
    price NUMERIC NOT NULL,
    change NUMERIC NOT NULL DEFAULT 0,
    change_percent NUMERIC NOT NULL DEFAULT 0,
    volume BIGINT,
    high NUMERIC,
    low NUMERIC,
    open NUMERIC,
    previous_close NUMERIC,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    provider TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_quotes_symbol_id ON market_quotes(symbol_id);
CREATE INDEX idx_market_quotes_timestamp ON market_quotes(timestamp DESC);

-- Market OHLCV table (historical data)
CREATE TABLE market_ohlcv (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol_id UUID NOT NULL REFERENCES market_symbols(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    open NUMERIC NOT NULL,
    high NUMERIC NOT NULL,
    low NUMERIC NOT NULL,
    close NUMERIC NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    provider TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (symbol_id, date, provider)
);

CREATE INDEX idx_market_ohlcv_symbol_date ON market_ohlcv(symbol_id, date DESC);

-- Market event links table
CREATE TABLE market_event_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol_id UUID NOT NULL REFERENCES market_symbols(id) ON DELETE CASCADE,
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    rationale TEXT,
    impact_assessment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (symbol_id, cluster_id)
);

-- Watchlists table
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('country', 'topic', 'entity', 'asset')),
    items JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);

-- Alerts table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type alert_type NOT NULL,
    config JSONB NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_enabled ON alerts(enabled) WHERE enabled = true;

-- Alert events table
CREATE TABLE alert_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_events_user_id ON alert_events(user_id);
CREATE INDEX idx_alert_events_read ON alert_events(user_id, read) WHERE read = false;

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Settings table
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Research queries table
CREATE TABLE research_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    response JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_research_queries_user_id ON research_queries(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at
    BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clusters_updated_at
    BEFORE UPDATE ON clusters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_countries_updated_at
    BEFORE UPDATE ON countries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hypotheses_updated_at
    BEFORE UPDATE ON hypotheses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playbooks_updated_at
    BEFORE UPDATE ON playbooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_causal_graphs_updated_at
    BEFORE UPDATE ON causal_graphs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_symbols_updated_at
    BEFORE UPDATE ON market_symbols
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at
    BEFORE UPDATE ON watchlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        'reader'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Full-text search function for articles
CREATE OR REPLACE FUNCTION search_articles(
    query_text TEXT,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    snippet TEXT,
    url TEXT,
    published_at TIMESTAMPTZ,
    source_name TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.snippet,
        a.url,
        a.published_at,
        s.name as source_name,
        ts_rank(
            to_tsvector('english', a.title || ' ' || COALESCE(a.snippet, '')),
            plainto_tsquery('english', query_text)
        ) as rank
    FROM articles a
    JOIN sources s ON s.id = a.source_id
    WHERE to_tsvector('english', a.title || ' ' || COALESCE(a.snippet, '')) 
          @@ plainto_tsquery('english', query_text)
    ORDER BY rank DESC, a.published_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

