/**
 * Entity Extraction and Normalization for Link Analysis
 * 
 * Extracts entities from articles and normalizes them to create a knowledge graph
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ExtractedEntity {
  name: string
  type: 'person' | 'organization' | 'location' | 'event' | 'country'
  canonical_name?: string
  aliases?: string[]
  metadata?: {
    title?: string // Para personas: "President", "Minister", etc.
    country?: string // País asociado
    role?: string // Rol en organización
    [key: string]: unknown
  }
}

export interface EntityMention {
  entity_id: string
  article_id: string
  cluster_id?: string
  context?: string
}

/**
 * Extract and normalize entities from article content
 */
export async function extractEntitiesFromArticle(
  article: {
    id: string
    title: string
    snippet?: string | null
    countries?: string[] | null
    entities?: {
      people?: string[]
      organizations?: string[]
      locations?: string[]
      events?: string[]
    } | null
  }
): Promise<ExtractedEntity[]> {
  // Use existing entity extraction from OSINT analysis if available
  const existingEntities = article.entities
  const extracted: ExtractedEntity[] = []

  // Extract people
  if (existingEntities?.people) {
    for (const person of existingEntities.people) {
      extracted.push({
        name: person,
        type: 'person',
        metadata: {},
      })
    }
  }

  // Extract organizations
  if (existingEntities?.organizations) {
    for (const org of existingEntities.organizations) {
      extracted.push({
        name: org,
        type: 'organization',
        metadata: {},
      })
    }
  }

  // Extract locations
  if (existingEntities?.locations) {
    for (const location of existingEntities.locations) {
      extracted.push({
        name: location,
        type: 'location',
        metadata: {},
      })
    }
  }

  // Extract countries
  if (article.countries) {
    for (const country of article.countries) {
      extracted.push({
        name: country,
        type: 'country',
        metadata: {},
      })
    }
  }

  // If no entities found, try to extract using AI
  if (extracted.length === 0 && article.title) {
    try {
      const aiExtracted = await extractEntitiesWithAI(article.title, article.snippet || '')
      extracted.push(...aiExtracted)
    } catch (error) {
      console.error('Error extracting entities with AI:', error)
    }
  }

  return extracted
}

/**
 * Use AI to extract entities when OSINT analysis is not available
 */
async function extractEntitiesWithAI(
  title: string,
  content: string
): Promise<ExtractedEntity[]> {
  const prompt = `Extract all geopolitical entities from the following text. Return ONLY a JSON array of entities with this structure:
[
  {
    "name": "exact name as mentioned",
    "type": "person" | "organization" | "location" | "event" | "country",
    "canonical_name": "normalized name if different",
    "metadata": {}
  }
]

Text:
Title: ${title}
Content: ${content.substring(0, 1000)}

Return ONLY the JSON array, no other text.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an entity extraction system. Extract geopolitical entities (people, organizations, locations, events, countries) from text. Return ONLY valid JSON array.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  })

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || '{}')
    return result.entities || []
  } catch {
    return []
  }
}

/**
 * Normalize entity name (resolve aliases, variations)
 */
export async function normalizeEntityName(
  supabase: SupabaseClient<Database>,
  entity: ExtractedEntity
): Promise<string> {
  // Check if entity already exists
  const { data: existing } = await supabase
    .from('entities')
    .select('canonical_name, aliases')
    .eq('name', entity.name)
    .eq('type', entity.type)
    .single() as { data: { canonical_name: string | null; aliases: string[] | null } | null }

  if (existing?.canonical_name) {
    return existing.canonical_name
  }

  // Check aliases
  if (existing?.aliases && existing.aliases.includes(entity.name)) {
    const { data: canonical } = await supabase
      .from('entities')
      .select('canonical_name')
      .eq('canonical_name', existing.aliases[0])
      .eq('type', entity.type)
      .single() as { data: { canonical_name: string | null } | null }

    if (canonical?.canonical_name) {
      return canonical.canonical_name
    }
  }

  // Use AI to find canonical name if needed
  if (entity.type === 'person') {
    const canonical = await findCanonicalNameWithAI(entity.name, entity.type)
    return canonical || entity.name
  }

  return entity.name
}

/**
 * Use AI to find canonical name for an entity
 */
async function findCanonicalNameWithAI(
  name: string,
  type: string
): Promise<string | null> {
  if (type !== 'person') return null

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a name normalization system. Given a person name, return the most common/canonical form. Return ONLY the canonical name, no other text.',
        },
        {
          role: 'user',
          content: `Normalize this name: ${name}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 50,
    })

    return response.choices[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}

/**
 * Store or update entity in database
 */
export async function storeEntity(
  supabase: SupabaseClient<Database>,
  entity: ExtractedEntity
): Promise<string> {
  const canonicalName = entity.canonical_name || entity.name

  // Check if entity exists
  const { data: existing } = await supabase
    .from('entities')
    .select('id, aliases, canonical_name')
    .eq('name', entity.name)
    .eq('type', entity.type)
    .single() as { data: { id: string; aliases: string[] | null; canonical_name: string | null } | null }

  if (existing) {
    // Update aliases if needed
    if (canonicalName !== entity.name && !existing.aliases?.includes(entity.name)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('entities')
        .update({
          aliases: [...(existing.aliases || []), entity.name],
          canonical_name: existing.canonical_name || canonicalName,
          last_seen_at: new Date().toISOString(),
          metadata: entity.metadata || {},
        })
        .eq('id', existing.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('entities')
        .update({
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    }
    return existing.id
  }

  // Check if canonical name exists
  if (canonicalName !== entity.name) {
    const { data: canonicalEntity } = await supabase
      .from('entities')
      .select('id, aliases')
      .eq('canonical_name', canonicalName)
      .eq('type', entity.type)
      .single() as { data: { id: string; aliases: string[] | null } | null }

    if (canonicalEntity) {
      // Add as alias
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('entities')
        .update({
          aliases: [...(canonicalEntity.aliases || []), entity.name],
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', canonicalEntity.id)
      return canonicalEntity.id
    }
  }

  // Create new entity
  const { data: newEntity, error } = await supabase
    .from('entities')
    .insert({
      name: entity.name,
      type: entity.type,
      canonical_name: canonicalName,
      aliases: canonicalName !== entity.name ? [entity.name] : [],
      metadata: entity.metadata || {},
    } as any)
    .select('id')
    .single() as { data: { id: string } | null; error: any }

  if (error) throw error
  return (newEntity as { id: string }).id
}

/**
 * Store entity mention in article
 */
export async function storeEntityMention(
  supabase: SupabaseClient<Database>,
  mention: EntityMention
): Promise<void> {
  const { error } = await supabase.from('entity_mentions').upsert(
    {
      entity_id: mention.entity_id,
      article_id: mention.article_id,
      cluster_id: mention.cluster_id || null,
      context: mention.context || null,
    } as any,
    {
      onConflict: 'entity_id,article_id',
      ignoreDuplicates: false,
    }
  )

  if (error) {
    console.error('Error storing entity mention:', error)
    throw error
  }
}
