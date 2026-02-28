-- Improve article deduplication
-- Add unique constraint on canonical_url to prevent duplicates

-- First, remove any existing duplicates (keep the oldest one based on created_at)
-- This will keep the first article inserted for each canonical_url
DELETE FROM articles a1
WHERE EXISTS (
  SELECT 1 FROM articles a2
  WHERE a2.canonical_url = a1.canonical_url
    AND a2.created_at < a1.created_at
);

-- Also remove duplicates by content_hash (keep oldest)
DELETE FROM articles a1
WHERE a1.content_hash IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM articles a2
    WHERE a2.content_hash = a1.content_hash
      AND a2.content_hash IS NOT NULL
      AND a2.created_at < a1.created_at
  );

-- Add unique index on canonical_url to prevent future duplicates
-- Drop existing non-unique index first if it exists
DROP INDEX IF EXISTS idx_articles_canonical_url;

CREATE UNIQUE INDEX idx_articles_canonical_url_unique 
ON articles(canonical_url);

-- Also add unique index on content_hash where not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_content_hash_unique 
ON articles(content_hash) 
WHERE content_hash IS NOT NULL;

-- Add composite index for domain + title lookup (for deduplication checks)
CREATE INDEX IF NOT EXISTS idx_articles_domain_title 
ON articles(domain, published_at DESC);

