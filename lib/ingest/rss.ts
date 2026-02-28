import { SupabaseClient } from '@supabase/supabase-js'
import Parser from 'rss-parser'
import { convert } from 'html-to-text'
import DOMPurify from 'isomorphic-dompurify'
import { hashString } from '@/lib/utils'
import type { Database } from '@/types/database'

type Source = Database['public']['Tables']['sources']['Row']

interface IngestResult {
  fetched: number
  new: number
  duplicate: number
}

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'IntelDesk/1.0 (RSS Aggregator)',
  },
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator'],
      ['dc:date', 'date'],
      ['dc:published', 'published'],
      ['media:content', 'mediaContent'],
    ],
  },
})

/**
 * Extract canonical URL from a URL string
 */
function getCanonicalUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Remove tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source']
    trackingParams.forEach((param) => parsed.searchParams.delete(param))
    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * Extract domain from URL
 */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return 'unknown'
  }
}

/**
 * Parse and normalize date from various formats
 * Handles multiple date formats commonly found in RSS feeds
 */
function parseDate(dateStr: string | undefined | null): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  
  // Clean the date string
  const cleaned = dateStr.trim()
  if (!cleaned) return null
  
  try {
    // Try direct Date parsing first (handles ISO 8601, RFC 2822, etc.)
    let date = new Date(cleaned)
    
    // If that fails, try some common RSS date formats
    if (isNaN(date.getTime())) {
      // Try RFC 822/2822 format variations
      const rfcMatch = cleaned.match(/(\w{3}),?\s+(\d{1,2})\s+(\w{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)
      if (rfcMatch) {
        date = new Date(cleaned)
      }
    }
    
    // If still invalid, try parsing common formats manually
    if (isNaN(date.getTime())) {
      // Try YYYY-MM-DD HH:MM:SS
      const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2}):(\d{2})/)
      if (isoMatch) {
        date = new Date(
          parseInt(isoMatch[1]),
          parseInt(isoMatch[2]) - 1,
          parseInt(isoMatch[3]),
          parseInt(isoMatch[4]),
          parseInt(isoMatch[5]),
          parseInt(isoMatch[6])
        )
      }
    }
    
    // Final validation
    if (isNaN(date.getTime())) {
      console.warn(`Failed to parse date: ${dateStr}`)
      return null
    }
    
    // Ensure date is not in the future (more than 1 hour ahead)
    const now = new Date()
    const maxFuture = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour ahead
    if (date > maxFuture) {
      console.warn(`Date is too far in the future, using current time: ${dateStr}`)
      return now.toISOString()
    }
    
    // Ensure date is not too old (more than 10 years)
    const tenYearsAgo = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000)
    if (date < tenYearsAgo) {
      console.warn(`Date is too old, using current time: ${dateStr}`)
      return now.toISOString()
    }
    
    return date.toISOString()
  } catch (error) {
    console.warn(`Error parsing date "${dateStr}":`, error)
    return null
  }
}

/**
 * Extract snippet from content
 */
function extractSnippet(content: string | undefined, maxLength: number = 500): string | null {
  if (!content) return null

  // Sanitize HTML
  const sanitized = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] })
  
  // Convert to plain text
  const text = convert(sanitized, {
    wordwrap: false,
    preserveNewlines: false,
  }).trim()

  if (!text) return null

  // Truncate if needed
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '...')
}

/**
 * Detect language from text (simplified)
 */
function detectLanguage(text: string): string {
  // Very simplified detection - in production use a proper library
  const sample = text.toLowerCase().slice(0, 200)
  
  // Check for common language indicators
  if (/[а-яё]/i.test(sample)) return 'ru'
  if (/[\u4e00-\u9fff]/.test(sample)) return 'zh'
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(sample)) return 'ja'
  if (/[\uac00-\ud7af]/.test(sample)) return 'ko'
  if (/[\u0600-\u06ff]/.test(sample)) return 'ar'
  
  return 'en' // Default to English
}

/**
 * Ingest RSS feed for a source
 * @param maxItems Maximum number of items to process per feed (default: 30)
 */
export async function ingestRSS(
  supabase: SupabaseClient<Database>,
  source: Source,
  maxItems: number = 30
): Promise<IngestResult> {
  const result: IngestResult = {
    fetched: 0,
    new: 0,
    duplicate: 0,
  }

  if (!source.rss_url) {
    throw new Error('Source has no RSS URL')
  }

  // Fetch and parse RSS feed
  const feed = await parser.parseURL(source.rss_url)
  
  if (!feed.items || feed.items.length === 0) {
    return result
  }

  // Limit items to process (take most recent ones)
  const itemsToProcess = feed.items.slice(0, maxItems)
  result.fetched = itemsToProcess.length

  // Process items in batches to avoid blocking
  const BATCH_SIZE = 5
  for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
    const batch = itemsToProcess.slice(i, i + BATCH_SIZE)
    
    // Process batch
    for (const item of batch) {
    if (!item.link || !item.title) continue

    const canonicalUrl = getCanonicalUrl(item.link)
    const domain = getDomain(item.link)
    const content = item.contentEncoded || item.content || item.contentSnippet
    const snippet = extractSnippet(content)
    const contentHash = snippet ? hashString(snippet) : null

    // Check for duplicates - multiple strategies
    // 1. Check by canonical URL (most reliable)
    const { data: existingByUrl } = await supabase
      .from('articles')
      .select('id')
      .eq('canonical_url', canonicalUrl)
      .limit(1)

    if (existingByUrl && existingByUrl.length > 0) {
      result.duplicate++
      continue
    }

    // 2. Check by content hash if available
    if (contentHash) {
      const { data: existingByHash } = await supabase
        .from('articles')
        .select('id')
        .eq('content_hash', contentHash)
        .limit(1)

      if (existingByHash && existingByHash.length > 0) {
        result.duplicate++
        continue
      }
    }

    // 3. Check by domain + title (for same story from different sources)
    // Normalize title for comparison
    const normalizedTitle = item.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) // Use first 100 chars for comparison

    const { data: existingByTitle } = await supabase
      .from('articles')
      .select('id, title, domain')
      .eq('domain', domain)
      .gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .limit(10)

    if (existingByTitle && existingByTitle.length > 0) {
      // Check if any existing article has very similar title
      const isDuplicate = existingByTitle.some((existing: { id: string; title: string; domain: string }) => {
        const existingNormalized = existing.title
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 100)

        // Calculate similarity using word overlap
        const words1 = new Set(normalizedTitle.split(/\s+/).filter((w: string) => w.length > 3))
        const words2 = new Set(existingNormalized.split(/\s+/).filter((w: string) => w.length > 3))
        
        if (words1.size === 0 || words2.size === 0) return false

        const intersection = Array.from(words1).filter(w => words2.has(w)).length
        const union = new Set([...Array.from(words1), ...Array.from(words2)]).size
        
        // If more than 70% word overlap, consider duplicate
        return intersection / union > 0.7
      })

      if (isDuplicate) {
        result.duplicate++
        continue
      }
    }

    // Extract date from multiple possible fields in RSS feed
    // Priority: pubDate > isoDate > dc:date > dc:published > content:encoded (try to extract from HTML)
    const itemAny = item as any
    let articleDate = parseDate(
      item.pubDate || 
      item.isoDate || 
      itemAny.date || 
      itemAny.published ||
      itemAny['dc:date'] ||
      itemAny['dc:published']
    )
    
    // If no date found, try to extract from content (some feeds embed dates in HTML)
    if (!articleDate && content) {
      // Look for common date patterns in content
      const datePatterns = [
        /(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2}):(\d{2})/, // ISO format
        /(\w{3}),?\s+(\d{1,2})\s+(\w{3})\s+(\d{4})/, // RFC format
        /published[:\s]+([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})/i, // "Published: Jan 1, 2024"
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
      ]
      
      for (const pattern of datePatterns) {
        const match = content.match(pattern)
        if (match) {
          articleDate = parseDate(match[0] || match[1])
          if (articleDate) break
        }
      }
    }
    
    // Fallback: Use current time if no date could be extracted
    // This ensures we always have a date for sorting and filtering
    const finalDate = articleDate || new Date().toISOString()
    
    if (!articleDate) {
      console.warn(`No date found for article "${item.title}" from ${source.name}, using current time`)
    }

    // Insert new article with conflict handling
    // Use upsert to handle race conditions where duplicate check passes but insert fails
    const { error, data } = await supabase
      .from('articles')
      .insert({
        source_id: source.id,
        title: item.title,
        url: item.link,
        canonical_url: canonicalUrl,
        domain,
        published_at: finalDate,
        snippet,
        content_hash: contentHash,
        language: source.language || detectLanguage(item.title + ' ' + (snippet || '')),
        countries: [], // Will be extracted by NLP pipeline
        topics: [], // Will be extracted by NLP pipeline
        entities: {},
      } as any)
      .select('id')

    if (error) {
      // Check if error is due to unique constraint violation
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        result.duplicate++
      } else {
        console.error(`Error inserting article ${item.title}:`, error)
      }
    } else if (data && data.length > 0) {
      result.new++
    }
    }
    
    // Small delay between batches to avoid overwhelming the database
    if (i + BATCH_SIZE < itemsToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
    }
  }

  return result
}

