-- Link Analysis / Network Analysis Tables
-- Enables entity relationship mapping and network visualization

-- Create custom types for entities and relationships
CREATE TYPE entity_type AS ENUM ('person', 'organization', 'location', 'event', 'country');
CREATE TYPE relationship_type AS ENUM (
    'mentioned_together', -- Mencionadas juntas en artículos
    'cooperation', -- Cooperación
    'conflict', -- Conflicto
    'trade', -- Comercio
    'diplomacy', -- Diplomacia
    'military', -- Militar
    'economic', -- Económico
    'influence', -- Influencia
    'membership', -- Membresía
    'leadership', -- Liderazgo
    'location', -- Ubicación
    'event_participant' -- Participante en evento
);

-- Entities table: Normalized entities extracted from articles
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type entity_type NOT NULL,
    canonical_name TEXT, -- Nombre normalizado (ej: "Joe Biden" -> "Joseph R. Biden")
    aliases TEXT[] DEFAULT '{}', -- Variaciones del nombre
    metadata JSONB DEFAULT '{}', -- Información adicional (cargo, país, etc.)
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    article_count INTEGER NOT NULL DEFAULT 0, -- Número de artículos donde aparece
    cluster_count INTEGER NOT NULL DEFAULT 0, -- Número de clusters donde aparece
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, type)
);

-- Entity relationships table: Connections between entities
CREATE TABLE entity_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relationship_type relationship_type NOT NULL,
    strength NUMERIC NOT NULL DEFAULT 1.0 CHECK (strength >= 0 AND strength <= 1),
    -- Fuerza de la relación basada en frecuencia, contexto, severidad, etc.
    context TEXT, -- Contexto de la relación (ej: "Trade agreement", "Military exercise")
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    article_count INTEGER NOT NULL DEFAULT 0, -- Número de artículos que mencionan esta relación
    cluster_ids UUID[] DEFAULT '{}', -- Clusters donde aparece esta relación
    metadata JSONB DEFAULT '{}', -- Información adicional
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- Entity mentions: Track which entities appear in which articles
CREATE TABLE entity_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES clusters(id) ON DELETE SET NULL,
    context TEXT, -- Contexto de la mención en el artículo
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entity_id, article_id)
);

-- Indexes for performance
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_canonical ON entities(canonical_name);
CREATE INDEX idx_entities_last_seen ON entities(last_seen_at DESC);
CREATE INDEX idx_entities_article_count ON entities(article_count DESC);

CREATE INDEX idx_relationships_source ON entity_relationships(source_entity_id);
CREATE INDEX idx_relationships_target ON entity_relationships(target_entity_id);
CREATE INDEX idx_relationships_type ON entity_relationships(relationship_type);
CREATE INDEX idx_relationships_strength ON entity_relationships(strength DESC);
CREATE INDEX idx_relationships_last_seen ON entity_relationships(last_seen_at DESC);
CREATE INDEX idx_relationships_bidirectional ON entity_relationships(source_entity_id, target_entity_id);

CREATE INDEX idx_mentions_entity ON entity_mentions(entity_id);
CREATE INDEX idx_mentions_article ON entity_mentions(article_id);
CREATE INDEX idx_mentions_cluster ON entity_mentions(cluster_id);

-- Function to update entity timestamps
CREATE OR REPLACE FUNCTION update_entity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entities_timestamp
    BEFORE UPDATE ON entities
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_timestamp();

CREATE TRIGGER update_relationships_timestamp
    BEFORE UPDATE ON entity_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_timestamp();

-- Function to update entity counts
CREATE OR REPLACE FUNCTION update_entity_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update article_count for entity
    UPDATE entities
    SET article_count = (
        SELECT COUNT(DISTINCT article_id)
        FROM entity_mentions
        WHERE entity_id = NEW.entity_id
    )
    WHERE id = NEW.entity_id;
    
    -- Update cluster_count for entity
    UPDATE entities
    SET cluster_count = (
        SELECT COUNT(DISTINCT cluster_id)
        FROM entity_mentions
        WHERE entity_id = NEW.entity_id AND cluster_id IS NOT NULL
    )
    WHERE id = NEW.entity_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entity_counts_trigger
    AFTER INSERT OR DELETE ON entity_mentions
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_counts();

-- RLS Policies
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_mentions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Entities are viewable by authenticated users"
    ON entities FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Relationships are viewable by authenticated users"
    ON entity_relationships FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Mentions are viewable by authenticated users"
    ON entity_mentions FOR SELECT
    TO authenticated
    USING (true);

-- Only admins and analysts can insert/update
CREATE POLICY "Only admins and analysts can modify entities"
    ON entities FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'analyst')
        )
    );

CREATE POLICY "Only admins and analysts can modify relationships"
    ON entity_relationships FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'analyst')
        )
    );

CREATE POLICY "Only admins and analysts can modify mentions"
    ON entity_mentions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'analyst')
        )
    );
