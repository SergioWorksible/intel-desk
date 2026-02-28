import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { analyzeMentions, updateArticleWithMentions, getMentionStats } from '@/lib/osint/mention-analysis'

export const dynamic = 'force-dynamic'

/**
 * POST /api/osint/analyze-mentions
 * Analyze mentions for a specific article or batch of articles
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { article_id, batch_ids, time_range } = body

    const supabase = createServiceClient()

    // Single article analysis
    if (article_id) {
      const { data: article, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', article_id)
        .single()

      if (error || !article) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 })
      }

      const analysis = await analyzeMentions(article)
      if (!analysis) {
        return NextResponse.json({ error: 'Failed to analyze mentions' }, { status: 500 })
      }

      await updateArticleWithMentions(supabase, article_id, analysis)

      return NextResponse.json({ success: true, analysis })
    }

    // Batch analysis
    if (batch_ids && Array.isArray(batch_ids)) {
      const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .in('id', batch_ids)
        .limit(50) // Limit batch size

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const results = []
      for (const article of articles || []) {
        const analysis = await analyzeMentions(article as any)
        if (analysis) {
          await updateArticleWithMentions(supabase, (article as any).id, analysis)
          results.push({ article_id: (article as any).id, analysis })
        }
        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      return NextResponse.json({ success: true, processed: results.length, results })
    }

    // Time range analysis (analyze recent articles without mentions)
    if (time_range) {
      const hours = parseInt(time_range) || 24
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .gte('published_at', since)
        .or('countries.is.null,countries.eq.{}')
        .limit(100)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const results = []
      for (const article of articles || []) {
        const analysis = await analyzeMentions(article as any)
        if (analysis) {
          await updateArticleWithMentions(supabase, (article as any).id, analysis)
          results.push({ article_id: (article as any).id, analysis })
        }
        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      return NextResponse.json({
        success: true,
        processed: results.length,
        results,
      })
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide article_id, batch_ids, or time_range' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in analyze-mentions API:', error)
    return NextResponse.json(
      { error: 'Failed to analyze mentions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/osint/analyze-mentions
 * Get mention statistics for a time period
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const hours = parseInt(searchParams.get('hours') || '24')
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000)
    const endDate = new Date()

    const supabase = createServiceClient()
    const stats = await getMentionStats(supabase, startDate, endDate)

    return NextResponse.json({ success: true, stats, time_range: { startDate, endDate } })
  } catch (error) {
    console.error('Error fetching mention stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch mention statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
