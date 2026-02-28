-- =====================================================
-- Migración: Añadir soporte para pgvector embeddings
-- Requiere la extensión pgvector habilitada en Supabase
-- =====================================================

-- 1. Habilitar extensión pgvector (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabla para embeddings de artículos
CREATE TABLE IF NOT EXISTS article_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    embedding vector(384),  -- 384 dimensiones para MiniLM
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT article_embeddings_article_id_unique UNIQUE (article_id)
);

-- 3. Tabla para embeddings de clusters (centroides)
CREATE TABLE IF NOT EXISTS cluster_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    embedding vector(384),  -- 384 dimensiones para MiniLM
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT cluster_embeddings_cluster_id_unique UNIQUE (cluster_id)
);

-- 4. Índices para búsqueda rápida de similitud
-- Usando IVFFlat para búsqueda aproximada (más rápido)
-- Para datasets pequeños (<10k), también funciona bien el índice exacto

-- Índice para artículos
CREATE INDEX IF NOT EXISTS article_embeddings_embedding_idx 
ON article_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Índice para clusters
CREATE INDEX IF NOT EXISTS cluster_embeddings_embedding_idx 
ON cluster_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);

-- 5. Índices adicionales
CREATE INDEX IF NOT EXISTS article_embeddings_article_id_idx 
ON article_embeddings(article_id);

CREATE INDEX IF NOT EXISTS cluster_embeddings_cluster_id_idx 
ON cluster_embeddings(cluster_id);

-- 6. Función para buscar clusters similares
CREATE OR REPLACE FUNCTION find_similar_clusters(
    query_embedding vector(384),
    similarity_threshold FLOAT DEFAULT 0.75,
    max_results INT DEFAULT 5
)
RETURNS TABLE (
    cluster_id UUID,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.cluster_id,
        (1 - (ce.embedding <=> query_embedding))::FLOAT as similarity
    FROM cluster_embeddings ce
    JOIN clusters c ON c.id = ce.cluster_id
    WHERE c.window_end > NOW() - INTERVAL '7 days'
    AND (1 - (ce.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY ce.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 7. Función para buscar artículos similares
CREATE OR REPLACE FUNCTION find_similar_articles(
    query_embedding vector(384),
    similarity_threshold FLOAT DEFAULT 0.8,
    max_results INT DEFAULT 10
)
RETURNS TABLE (
    article_id UUID,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.article_id,
        (1 - (ae.embedding <=> query_embedding))::FLOAT as similarity
    FROM article_embeddings ae
    JOIN articles a ON a.id = ae.article_id
    WHERE a.created_at > NOW() - INTERVAL '7 days'
    AND (1 - (ae.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY ae.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 8. Función para detectar duplicados
CREATE OR REPLACE FUNCTION find_duplicate_articles(
    dedup_threshold FLOAT DEFAULT 0.92
)
RETURNS TABLE (
    article_id_1 UUID,
    article_id_2 UUID,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae1.article_id as article_id_1,
        ae2.article_id as article_id_2,
        (1 - (ae1.embedding <=> ae2.embedding))::FLOAT as similarity
    FROM article_embeddings ae1
    JOIN article_embeddings ae2 ON ae1.article_id < ae2.article_id
    JOIN articles a1 ON a1.id = ae1.article_id
    JOIN articles a2 ON a2.id = ae2.article_id
    WHERE a1.created_at > NOW() - INTERVAL '3 days'
    AND a2.created_at > NOW() - INTERVAL '3 days'
    AND (1 - (ae1.embedding <=> ae2.embedding)) >= dedup_threshold
    ORDER BY similarity DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- 9. RLS Policies (opcional - si usas RLS)
-- Los embeddings solo son accesibles por el servicio

ALTER TABLE article_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_embeddings ENABLE ROW LEVEL SECURITY;

-- Política para service role (acceso completo)
CREATE POLICY "Service role can manage article_embeddings"
ON article_embeddings
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage cluster_embeddings"
ON cluster_embeddings
FOR ALL
USING (auth.role() = 'service_role');

-- 10. Comentarios
COMMENT ON TABLE article_embeddings IS 'Embeddings semánticos de artículos para clustering y búsqueda';
COMMENT ON TABLE cluster_embeddings IS 'Embeddings centroides de clusters para matching rápido';
COMMENT ON FUNCTION find_similar_clusters IS 'Encuentra clusters similares usando distancia coseno';
COMMENT ON FUNCTION find_similar_articles IS 'Encuentra artículos similares usando distancia coseno';
COMMENT ON FUNCTION find_duplicate_articles IS 'Detecta artículos duplicados o casi duplicados';
