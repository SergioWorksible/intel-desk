# Proposal: Link Analysis / Network Analysis for Intel Desk

## Why this tool?

**Link Analysis** is one of the most critical tools used by intelligence agencies like the CIA. It allows:

1. **Identify hidden connections**: Discover relationships between people, organizations, and countries that are not obvious at first glance
2. **Detect patterns**: Find network structures (clusters, hubs, bridges) that reveal key organizations or individuals
3. **Visualize influence**: Map influence and power networks
4. **Predictive analysis**: Identify critical nodes that could be pressure or influence points
5. **Anomaly detection**: Find unusual or suspicious connections

## Real use cases

### 1. Diplomatic relations analysis
- Map who meets with whom at international summits
- Identify key intermediaries in negotiations
- Detect changes in communication patterns between countries

### 2. Organization analysis
- Identify key members of international organizations
- Map relationships between think tanks, governments, and companies
- Detect cross-sector influence

### 3. Event analysis
- Connect people/organizations mentioned in the same event
- Identify who frequently appears with whom
- Detect communities of interest

### 4. Temporal analysis
- See how relationship networks evolve
- Identify new connections or ruptures
- Detect changes in communication patterns

## Proposed architecture

### Database

```sql
-- Normalized entities table
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('person', 'organization', 'location', 'event')),
    canonical_name TEXT, -- Normalized name (e.g., "Joe Biden" -> "Joseph R. Biden")
    aliases TEXT[], -- Name variations
    metadata JSONB, -- Additional info (position, country, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, type)
);

-- Entity relationships table
CREATE TABLE entity_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN (
        'mentioned_together', -- Mentioned together in articles
        'cooperation', -- Cooperation
        'conflict', -- Conflict
        'trade', -- Trade
        'diplomacy', -- Diplomacy
        'military', -- Military
        'economic', -- Economic
        'influence', -- Influence
        'membership', -- Membership
        'leadership', -- Leadership
        'location', -- Location
        'event_participant' -- Event participant
    )),
    strength NUMERIC NOT NULL DEFAULT 1.0 CHECK (strength >= 0 AND strength <= 1),
    -- Relationship strength based on frequency, context, etc.
    context TEXT, -- Relationship context
    first_seen_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL,
    article_count INTEGER NOT NULL DEFAULT 0, -- Number of articles mentioning this relationship
    cluster_ids UUID[], -- Clusters where this relationship appears
    metadata JSONB, -- Additional info
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- Indexes for fast searches
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_canonical ON entities(canonical_name);
CREATE INDEX idx_relationships_source ON entity_relationships(source_entity_id);
CREATE INDEX idx_relationships_target ON entity_relationships(target_entity_id);
CREATE INDEX idx_relationships_type ON entity_relationships(relationship_type);
CREATE INDEX idx_relationships_strength ON entity_relationships(strength DESC);
CREATE INDEX idx_relationships_last_seen ON entity_relationships(last_seen_at DESC);
```

### Processing

1. **Entity extraction**: Already exists in `lib/osint/mention-analysis.ts`
2. **Entity normalization**: Resolve name variations (e.g., "Joe Biden" = "Joseph Biden" = "President Biden")
3. **Relationship detection**: Analyze co-occurrences and context in articles
4. **Strength calculation**: Based on frequency, recency, context, event severity

### API

```typescript
// GET /api/network/entities?type=person&search=Joe
// Search entities

// GET /api/network/relationships?entity_id=xxx&depth=2
// Get entity relationships (with depth)

// GET /api/network/graph?entity_ids=xxx,yyy&relationship_types=cooperation,conflict
// Get specific subgraph

// POST /api/network/analyze
// Analyze articles/clusters and update relationships

// GET /api/network/centrality?type=betweenness
// Calculate centrality metrics (identify key nodes)

// GET /api/network/communities
// Detect communities/clusters in the network
```

### Visualization

Use React Flow (already integrated) to visualize:
- **Nodes**: Entities (people, organizations, countries)
- **Edges**: Relationships between entities
- **Layouts**: Force-directed, hierarchical, circular
- **Filters**: By relationship type, strength, date, etc.

### Network metrics

1. **Degree centrality**: Number of connections
2. **Betweenness centrality**: Nodes connecting communities
3. **Closeness centrality**: Average distance to other nodes
4. **PageRank**: Importance based on important connections
5. **Community detection**: Algorithms like Louvain

## Integration with existing features

### With Clusters
- Each cluster can have a subgraph of relationships between mentioned entities
- Visualize relationships on the cluster detail page

### With Briefings
- Include network analysis in briefings: "X and Y appear together frequently"
- Identify changes in relationship patterns

### With Alerts
- Alert when unusual new relationships appear
- Alert when important relationships break

### With Maps
- Visualize geographic relationships on the map
- Show connections between countries

## Phased implementation

### Phase 1: Base (MVP)
- [ ] Database tables
- [ ] Basic entity extraction and normalization
- [ ] Relationship detection by co-occurrence
- [ ] Basic API to get relationships
- [ ] Simple visualization with React Flow

### Phase 2: Advanced analysis
- [ ] Centrality metrics calculation
- [ ] Community detection
- [ ] Temporal analysis (network evolution)
- [ ] Advanced visualization filters

### Phase 3: Full integration
- [ ] Integration with clusters
- [ ] Integration with briefings
- [ ] Alerts based on network changes
- [ ] Network analysis export

## Usage example

```typescript
// Analyze relationships in a cluster
const clusterRelationships = await analyzeClusterRelationships(clusterId)

// Visualize a person's network
const personNetwork = await getEntityNetwork('Joe Biden', { depth: 2 })

// Find key intermediaries between two countries
const intermediaries = await findIntermediaries('US', 'CN', {
  relationshipType: 'diplomacy'
})

// Detect communities in the network
const communities = await detectCommunities({
  minSize: 3,
  relationshipTypes: ['cooperation', 'trade']
})
```

## Benefits

1. **Immediate value**: Reveals information not obvious from reading individual articles
2. **Scalable**: Works better with more data
3. **Visual**: Easy to understand for non-technical users
4. **Actionable**: Identifies influence and pressure points
5. **Differentiator**: Few OSINT platforms have advanced network analysis

## Technical resources

- **Algorithms**: NetworkX (Python) or Cytoscape.js (JavaScript) for analysis
- **Visualization**: React Flow (already integrated)
- **Normalization**: Fuzzy matching + AI to resolve name variations
- **Processing**: Background jobs for large volume analysis
