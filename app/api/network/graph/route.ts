import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/network/graph
 * Get network graph data for visualization
 * 
 * Query params:
 * - entity_ids: comma-separated entity IDs (optional)
 * - relationship_types: comma-separated types (optional)
 * - min_strength: minimum relationship strength (0-1, default 0.3)
 * - depth: how many hops from starting entities (default 1)
 * - limit: max nodes to return (default 100)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const searchParams = request.nextUrl.searchParams

    const entityIds = searchParams.get('entity_ids')?.split(',').filter(Boolean) || []
    const relationshipTypes =
      searchParams.get('relationship_types')?.split(',').filter(Boolean) || []
    const minStrength = parseFloat(searchParams.get('min_strength') || '0.3')
    const depth = parseInt(searchParams.get('depth') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build query
    let query = supabase
      .from('entity_relationships')
      .select(
        `
        id,
        source_entity_id,
        target_entity_id,
        relationship_type,
        strength,
        context,
        source_entity:entities!source_entity_id(id, name, type, canonical_name, metadata),
        target_entity:entities!target_entity_id(id, name, type, canonical_name, metadata)
      `
      )
      .gte('strength', minStrength)
      .order('strength', { ascending: false })
      .limit(limit)

    // Filter by relationship types
    if (relationshipTypes.length > 0) {
      query = query.in('relationship_type', relationshipTypes)
    }

    // Filter by entity IDs (if provided, get relationships involving these entities)
    if (entityIds.length > 0) {
      query = query.or(
        `source_entity_id.in.(${entityIds.join(',')}),target_entity_id.in.(${entityIds.join(',')})`
      )
    }

    const { data: relationships, error } = await query

    if (error) {
      throw error
    }

    // Build nodes and edges
    const nodesMap = new Map<string, any>()
    const edges: any[] = []

    relationships?.forEach((rel: any) => {
      // Add source node
      if (rel.source_entity && !nodesMap.has(rel.source_entity.id)) {
        nodesMap.set(rel.source_entity.id, {
          id: rel.source_entity.id,
          label: rel.source_entity.canonical_name || rel.source_entity.name,
          type: rel.source_entity.type,
          metadata: rel.source_entity.metadata || {},
        })
      }

      // Add target node
      if (rel.target_entity && !nodesMap.has(rel.target_entity.id)) {
        nodesMap.set(rel.target_entity.id, {
          id: rel.target_entity.id,
          label: rel.target_entity.canonical_name || rel.target_entity.name,
          type: rel.target_entity.type,
          metadata: rel.target_entity.metadata || {},
        })
      }

      // Add edge
      edges.push({
        id: rel.id,
        source: rel.source_entity_id,
        target: rel.target_entity_id,
        type: rel.relationship_type,
        strength: rel.strength,
        label: rel.relationship_type.replace('_', ' '),
        context: rel.context,
      })
    })

    return NextResponse.json({
      nodes: Array.from(nodesMap.values()),
      edges: edges,
      stats: {
        node_count: nodesMap.size,
        edge_count: edges.length,
        relationship_types: Array.from(new Set(edges.map((e: any) => e.type))),
      },
    })
  } catch (error) {
    console.error('Error fetching network graph:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch network graph',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
