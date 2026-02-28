-- Add risk indices to countries table
ALTER TABLE countries ADD COLUMN IF NOT EXISTS stability_index INTEGER DEFAULT 50;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS economic_index INTEGER DEFAULT 50;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS political_index INTEGER DEFAULT 50;

-- Add check constraints for valid ranges (0-100)
ALTER TABLE countries ADD CONSTRAINT check_stability_index CHECK (stability_index >= 0 AND stability_index <= 100);
ALTER TABLE countries ADD CONSTRAINT check_economic_index CHECK (economic_index >= 0 AND economic_index <= 100);
ALTER TABLE countries ADD CONSTRAINT check_political_index CHECK (political_index >= 0 AND political_index <= 100);

-- Add comments
COMMENT ON COLUMN countries.stability_index IS 'Overall stability index (0-100, higher = less stable)';
COMMENT ON COLUMN countries.economic_index IS 'Economic risk index (0-100, higher = more risk)';
COMMENT ON COLUMN countries.political_index IS 'Political risk index (0-100, higher = more risk)';

