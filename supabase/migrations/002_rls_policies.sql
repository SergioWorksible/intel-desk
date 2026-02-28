-- Intel Desk RLS Policies
-- Row Level Security for all tables

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hypothesis_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE causal_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_ohlcv ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_event_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_queries ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user can edit (admin or analyst)
CREATE OR REPLACE FUNCTION can_edit()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'analyst')
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- ========================================
-- PROFILES POLICIES
-- ========================================

-- Users can view all profiles
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "profiles_update_admin" ON profiles
    FOR UPDATE USING (is_admin());

-- ========================================
-- SOURCES POLICIES
-- ========================================

-- All authenticated users can view enabled sources
CREATE POLICY "sources_select" ON sources
    FOR SELECT USING (enabled = true OR is_admin());

-- Only admins can manage sources
CREATE POLICY "sources_insert" ON sources
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "sources_update" ON sources
    FOR UPDATE USING (is_admin());

CREATE POLICY "sources_delete" ON sources
    FOR DELETE USING (is_admin());

-- ========================================
-- ARTICLES POLICIES
-- ========================================

-- All authenticated users can view articles
CREATE POLICY "articles_select" ON articles
    FOR SELECT USING (true);

-- Service role can insert articles (via ingestion)
CREATE POLICY "articles_insert" ON articles
    FOR INSERT WITH CHECK (is_admin());

-- ========================================
-- CLUSTERS POLICIES
-- ========================================

-- All authenticated users can view clusters
CREATE POLICY "clusters_select" ON clusters
    FOR SELECT USING (true);

-- Only admins can manage clusters
CREATE POLICY "clusters_insert" ON clusters
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "clusters_update" ON clusters
    FOR UPDATE USING (is_admin());

-- ========================================
-- COUNTRIES POLICIES
-- ========================================

-- All authenticated users can view countries
CREATE POLICY "countries_select" ON countries
    FOR SELECT USING (true);

-- Admins can manage countries
CREATE POLICY "countries_insert" ON countries
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "countries_update" ON countries
    FOR UPDATE USING (is_admin());

-- ========================================
-- HYPOTHESES POLICIES
-- ========================================

-- All authenticated users can view hypotheses
CREATE POLICY "hypotheses_select" ON hypotheses
    FOR SELECT USING (true);

-- Analysts and admins can create hypotheses
CREATE POLICY "hypotheses_insert" ON hypotheses
    FOR INSERT WITH CHECK (can_edit() AND user_id = auth.uid());

-- Users can update their own hypotheses, admins can update any
CREATE POLICY "hypotheses_update" ON hypotheses
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- Users can delete their own hypotheses, admins can delete any
CREATE POLICY "hypotheses_delete" ON hypotheses
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ========================================
-- HYPOTHESIS REVISIONS POLICIES
-- ========================================

-- All authenticated users can view revisions
CREATE POLICY "hypothesis_revisions_select" ON hypothesis_revisions
    FOR SELECT USING (true);

-- Analysts and admins can create revisions
CREATE POLICY "hypothesis_revisions_insert" ON hypothesis_revisions
    FOR INSERT WITH CHECK (can_edit() AND user_id = auth.uid());

-- ========================================
-- PLAYBOOKS POLICIES
-- ========================================

-- All authenticated users can view playbooks
CREATE POLICY "playbooks_select" ON playbooks
    FOR SELECT USING (true);

-- Analysts and admins can create playbooks
CREATE POLICY "playbooks_insert" ON playbooks
    FOR INSERT WITH CHECK (can_edit() AND user_id = auth.uid());

-- Users can update their own playbooks
CREATE POLICY "playbooks_update" ON playbooks
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- Users can delete their own playbooks
CREATE POLICY "playbooks_delete" ON playbooks
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ========================================
-- CAUSAL GRAPHS POLICIES
-- ========================================

-- All authenticated users can view graphs
CREATE POLICY "causal_graphs_select" ON causal_graphs
    FOR SELECT USING (true);

-- Analysts and admins can create graphs
CREATE POLICY "causal_graphs_insert" ON causal_graphs
    FOR INSERT WITH CHECK (can_edit() AND user_id = auth.uid());

-- Users can update their own graphs
CREATE POLICY "causal_graphs_update" ON causal_graphs
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- Users can delete their own graphs
CREATE POLICY "causal_graphs_delete" ON causal_graphs
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ========================================
-- BRIEFINGS POLICIES
-- ========================================

-- All authenticated users can view briefings
CREATE POLICY "briefings_select" ON briefings
    FOR SELECT USING (true);

-- Only admins can manage briefings
CREATE POLICY "briefings_insert" ON briefings
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "briefings_update" ON briefings
    FOR UPDATE USING (is_admin());

-- ========================================
-- BRIEFING INTERACTIONS POLICIES
-- ========================================

-- Users can view their own interactions
CREATE POLICY "briefing_interactions_select" ON briefing_interactions
    FOR SELECT USING (user_id = auth.uid());

-- Users can create their own interactions
CREATE POLICY "briefing_interactions_insert" ON briefing_interactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ========================================
-- MARKET TABLES POLICIES
-- ========================================

-- All authenticated users can view market data
CREATE POLICY "market_symbols_select" ON market_symbols
    FOR SELECT USING (true);

CREATE POLICY "market_quotes_select" ON market_quotes
    FOR SELECT USING (true);

CREATE POLICY "market_ohlcv_select" ON market_ohlcv
    FOR SELECT USING (true);

CREATE POLICY "market_event_links_select" ON market_event_links
    FOR SELECT USING (true);

-- Only admins can manage market data
CREATE POLICY "market_symbols_admin" ON market_symbols
    FOR ALL USING (is_admin());

CREATE POLICY "market_event_links_insert" ON market_event_links
    FOR INSERT WITH CHECK (can_edit());

CREATE POLICY "market_event_links_update" ON market_event_links
    FOR UPDATE USING (can_edit());

-- ========================================
-- WATCHLISTS POLICIES
-- ========================================

-- Users can view their own watchlists
CREATE POLICY "watchlists_select" ON watchlists
    FOR SELECT USING (user_id = auth.uid());

-- Users can manage their own watchlists
CREATE POLICY "watchlists_insert" ON watchlists
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "watchlists_update" ON watchlists
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "watchlists_delete" ON watchlists
    FOR DELETE USING (user_id = auth.uid());

-- ========================================
-- ALERTS POLICIES
-- ========================================

-- Users can view their own alerts
CREATE POLICY "alerts_select" ON alerts
    FOR SELECT USING (user_id = auth.uid());

-- Users can manage their own alerts
CREATE POLICY "alerts_insert" ON alerts
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "alerts_update" ON alerts
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "alerts_delete" ON alerts
    FOR DELETE USING (user_id = auth.uid());

-- ========================================
-- ALERT EVENTS POLICIES
-- ========================================

-- Users can view their own alert events
CREATE POLICY "alert_events_select" ON alert_events
    FOR SELECT USING (user_id = auth.uid());

-- System can insert alert events (via service role)
CREATE POLICY "alert_events_insert" ON alert_events
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

-- Users can update their own alert events (mark as read)
CREATE POLICY "alert_events_update" ON alert_events
    FOR UPDATE USING (user_id = auth.uid());

-- ========================================
-- AUDIT LOGS POLICIES
-- ========================================

-- Only admins can view audit logs
CREATE POLICY "audit_logs_select" ON audit_logs
    FOR SELECT USING (is_admin());

-- System inserts audit logs (via service role)
CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- ========================================
-- SETTINGS POLICIES
-- ========================================

-- All authenticated users can view settings
CREATE POLICY "settings_select" ON settings
    FOR SELECT USING (true);

-- Only admins can manage settings
CREATE POLICY "settings_admin" ON settings
    FOR ALL USING (is_admin());

-- ========================================
-- RESEARCH QUERIES POLICIES
-- ========================================

-- Users can view their own research queries
CREATE POLICY "research_queries_select" ON research_queries
    FOR SELECT USING (user_id = auth.uid());

-- Users can create their own research queries
CREATE POLICY "research_queries_insert" ON research_queries
    FOR INSERT WITH CHECK (user_id = auth.uid());

