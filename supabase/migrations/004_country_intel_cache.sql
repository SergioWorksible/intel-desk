-- Country intel cache table for Perplexity API responses
CREATE TABLE IF NOT EXISTS country_intel_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(3) UNIQUE NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  intel_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_country_intel_cache_code ON country_intel_cache(country_code);
CREATE INDEX IF NOT EXISTS idx_country_intel_cache_updated ON country_intel_cache(updated_at);

-- RLS policies
ALTER TABLE country_intel_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached intel
CREATE POLICY "Country intel cache is readable by all" ON country_intel_cache
  FOR SELECT USING (true);

-- Only authenticated users can modify cache
CREATE POLICY "Authenticated users can update intel cache" ON country_intel_cache
  FOR ALL USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE country_intel_cache IS 'Cache for country intelligence data from Perplexity API, refreshed every 24 hours';

