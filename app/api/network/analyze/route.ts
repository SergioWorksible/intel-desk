import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { analyzeArticleForNetwork } from '@/lib/network/relationship-detection'

export const dynamic = 'force-dynamic'

/**
 * POST /api/network/analyze
 * Analyze articles/clusters and extract entities + relationships
 */
export async function POST(request: NextRequest) {
  try {
    // Use createClient for authentication (reads cookies)
    const supabase = createClient()
    const body = await request.json()

    // Check if user has permission
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role?: string } | null
    if (profileData?.role !== 'admin' && profileData?.role !== 'analyst') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use service client for database operations (bypasses RLS)
    const serviceSupabase = createServiceClient()

    // Options: article_id, cluster_id, or time_range
    if (body.article_id) {
      const result = await analyzeArticleForNetwork(serviceSupabase, body.article_id)
      return NextResponse.json({
        success: true,
        ...result,
      })
    }

    if (body.cluster_id) {
      // Analyze all articles in cluster
      const { data: articles } = await serviceSupabase
        .from('articles')
        .select('id')
        .eq('cluster_id', body.cluster_id) as { data: Array<{ id: string }> | null }

      const articlesArray = articles || []
      if (articlesArray.length === 0) {
        return NextResponse.json({
          success: true,
          entities_stored: 0,
          relationships_detected: 0,
        })
      }

      let totalEntities = 0
      let totalRelationships = 0

      for (const article of articlesArray) {
        try {
          const result = await analyzeArticleForNetwork(serviceSupabase, article.id)
          totalEntities += result.entities_stored
          totalRelationships += result.relationships_detected
        } catch (error) {
          console.error(`Error analyzing article ${article.id}:`, error)
        }
      }

      return NextResponse.json({
        success: true,
        entities_stored: totalEntities,
        relationships_detected: totalRelationships,
        articles_analyzed: articlesArray.length,
      })
    }

    if (body.time_range) {
      // Analyze articles from last N hours
      const hours = body.time_range || 24
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      const { data: articles } = await serviceSupabase
        .from('articles')
        .select('id')
        .gte('published_at', since)
        .limit(100) as { data: Array<{ id: string }> | null } // Limit to prevent timeout

      const articlesArray = articles || []
      if (articlesArray.length === 0) {
        return NextResponse.json({
          success: true,
          entities_stored: 0,
          relationships_detected: 0,
        })
      }

      let totalEntities = 0
      let totalRelationships = 0

      for (const article of articlesArray) {
        try {
          const result = await analyzeArticleForNetwork(serviceSupabase, article.id)
          totalEntities += result.entities_stored
          totalRelationships += result.relationships_detected
        } catch (error) {
          console.error(`Error analyzing article ${article.id}:`, error)
        }
      }

      return NextResponse.json({
        success: true,
        entities_stored: totalEntities,
        relationships_detected: totalRelationships,
        articles_analyzed: articlesArray.length,
      })
    }

    return NextResponse.json(
      { error: 'Must provide article_id, cluster_id, or time_range' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in network analyze:', error)
    return NextResponse.json(
      { error: 'Failed to analyze network', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
