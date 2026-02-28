/**
 * Relationship Detection for Link Analysis
 * 
 * Detects and tracks relationships between entities based on co-occurrence
 * and context analysis
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import OpenAI from 'openai'
import {
  extractEntitiesFromArticle,
  storeEntity,
  storeEntityMention,
} from './entity-extraction'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface DetectedRelationship {
  source_entity_id: string
  target_entity_id: string
  relationship_type:
    | 'mentioned_together'
    | 'cooperation'
    | 'conflict'
    | 'trade'
    | 'diplomacy'
    | 'military'
    | 'economic'
    | 'influence'
    | 'membership'
    | 'leadership'
    | 'location'
    | 'event_participant'
  strength: number // 0-1
  context?: string
  article_id: string
  cluster_id?: string
}

/**
 * Detect relationships from entity co-occurrences in articles
 */
export async function detectRelationshipsFromArticle(
  supabase: SupabaseClient<Database>,
  articleId: string,
  clusterId?: string
): Promise<DetectedRelationship[]> {
  // Get all entity mentions for this article
  const { data: mentions, error } = await supabase
    .from('entity_mentions')
    .select('entity_id, entity:entities(name, type)')
    .eq('article_id', articleId) as { data: Array<{ entity_id: string; entity: { name: string; type: string } }> | null; error: any }

  if (error || !mentions || mentions.length < 2) {
    return []
  }

  const relationships: DetectedRelationship[] = []

  // Get article for context
  const { data: article } = await supabase
    .from('articles')
    .select('title, snippet, countries, topics, severity, cluster_id')
    .eq('id', articleId)
    .single() as { data: { title: string | null; snippet: string | null; countries: string[] | null; topics: string[] | null; severity: number | null; cluster_id: string | null } | null }

  if (!article) return []

  // Generate pairs of entities
  for (let i = 0; i < mentions.length; i++) {
    for (let j = i + 1; j < mentions.length; j++) {
      const sourceEntity = mentions[i].entity as { name: string; type: string }
      const targetEntity = mentions[j].entity as { name: string; type: string }

      // Detect relationship type and strength
      const relationship = await detectRelationshipType(
        sourceEntity,
        targetEntity,
        article
      )

      if (relationship) {
        relationships.push({
          source_entity_id: mentions[i].entity_id,
          target_entity_id: mentions[j].entity_id,
          relationship_type: relationship.type,
          strength: relationship.strength,
          context: relationship.context,
          article_id: articleId,
          cluster_id: clusterId,
        })
      } else {
        // Default: mentioned together
        const articleData = article as { title?: string | null }
        relationships.push({
          source_entity_id: mentions[i].entity_id,
          target_entity_id: mentions[j].entity_id,
          relationship_type: 'mentioned_together',
          strength: 0.5,
          context: `Mentioned together in: ${articleData.title || 'article'}`,
          article_id: articleId,
          cluster_id: clusterId,
        })
      }
    }
  }

  return relationships
}

/**
 * Detect relationship type and strength using AI
 */
async function detectRelationshipType(
  source: { name: string; type: string },
  target: { name: string; type: string },
  article: {
    title?: string | null
    snippet?: string | null
    countries?: string[] | null
    topics?: string[] | null
    severity?: number | null
  }
): Promise<{ type: DetectedRelationship['relationship_type']; strength: number; context?: string } | null> {
  const context = `${article.title || ''} ${article.snippet || ''}`.substring(0, 500)

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a relationship detection system. Analyze the relationship between two entities in geopolitical context.
Return ONLY valid JSON with this structure:
{
  "type": "cooperation" | "conflict" | "trade" | "diplomacy" | "military" | "economic" | "influence" | "membership" | "leadership" | "location" | "event_participant" | "mentioned_together",
  "strength": 0.0-1.0,
  "context": "brief description"
}

If no clear relationship, return type "mentioned_together" with strength 0.3-0.5.`,
        },
        {
          role: 'user',
          content: `Entity 1: ${source.name} (${source.type})
Entity 2: ${target.name} (${target.type})
Context: ${context}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '{}')
    return {
      type: result.type || 'mentioned_together',
      strength: Math.max(0, Math.min(1, result.strength || 0.5)),
      context: result.context,
    }
  } catch (error) {
    console.error('Error detecting relationship:', error)
    return null
  }
}

/**
 * Store or update relationship in database
 */
export async function storeRelationship(
  supabase: SupabaseClient<Database>,
  relationship: DetectedRelationship
): Promise<void> {
  // Check if relationship exists
  const { data: existing } = await supabase
    .from('entity_relationships')
    .select('id, strength, article_count, cluster_ids, context')
    .eq('source_entity_id', relationship.source_entity_id)
    .eq('target_entity_id', relationship.target_entity_id)
    .eq('relationship_type', relationship.relationship_type)
    .single() as { data: { id: string; strength: number; article_count: number; cluster_ids: string[] | null; context: string | null } | null }

  if (existing) {
    // Update: increase strength, add cluster, increment article count
    const newStrength = Math.min(
      1,
      (existing.strength * existing.article_count + relationship.strength) /
        (existing.article_count + 1)
    )

    const clusterIds = relationship.cluster_id
      ? Array.from(new Set([...(existing.cluster_ids || []), relationship.cluster_id]))
      : existing.cluster_ids || []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('entity_relationships')
      .update({
        strength: newStrength,
        article_count: existing.article_count + 1,
        cluster_ids: clusterIds,
        last_seen_at: new Date().toISOString(),
        context: relationship.context || existing.context,
      })
      .eq('id', existing.id)
  } else {
    // Create new relationship
    await supabase.from('entity_relationships').insert({
      source_entity_id: relationship.source_entity_id,
      target_entity_id: relationship.target_entity_id,
      relationship_type: relationship.relationship_type,
      strength: relationship.strength,
      context: relationship.context,
      article_count: 1,
      cluster_ids: relationship.cluster_id ? [relationship.cluster_id] : [],
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    } as any)
  }
}

/**
 * Analyze article and extract entities + relationships
 */
export async function analyzeArticleForNetwork(
  supabase: SupabaseClient<Database>,
  articleId: string
): Promise<{
  entities_stored: number
  relationships_detected: number
}> {
  // Get article
  const { data: article, error: articleError } = await supabase
    .from('articles')
    .select('id, title, snippet, countries, entities, cluster_id')
    .eq('id', articleId)
    .single()

  if (articleError || !article) {
    throw new Error('Article not found')
  }

  // Extract entities
  const extractedEntities = await extractEntitiesFromArticle(article)
  const entityIds: string[] = []

  // Store entities
  for (const entity of extractedEntities) {
    try {
      const entityId = await storeEntity(supabase, entity)
      entityIds.push(entityId)

      // Store mention
      const articleDataForMention = article as { cluster_id?: string | null }
      await storeEntityMention(supabase, {
        entity_id: entityId,
        article_id: articleId,
        cluster_id: articleDataForMention.cluster_id || undefined,
      })
    } catch (error) {
      console.error('Error storing entity:', error)
    }
  }

  // Detect relationships
  const articleData = article as { cluster_id?: string | null }
  const relationships = await detectRelationshipsFromArticle(
    supabase,
    articleId,
    articleData.cluster_id || undefined
  )

  // Store relationships
  for (const rel of relationships) {
    try {
      await storeRelationship(supabase, rel)
    } catch (error) {
      console.error('Error storing relationship:', error)
    }
  }

  return {
    entities_stored: entityIds.length,
    relationships_detected: relationships.length,
  }
}
