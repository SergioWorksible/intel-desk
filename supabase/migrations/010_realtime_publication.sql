-- Enable Supabase Realtime for clusters, articles, and briefings
-- Allows clients to receive real-time updates via postgres_changes
-- instead of polling every 30-60 seconds
--
-- Docs: https://supabase.com/docs/guides/realtime/postgres-changes

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'clusters'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE clusters;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'articles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE articles;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'briefings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE briefings;
  END IF;
END
$$;
