import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { smartClusterArticles } from '@/lib/ingest/smart-cluster'
import { repairAndEnrichCluster } from '@/lib/ingest/repair-cluster'

export const dynamic = 'force-dynamic'

/**
 * Re-analyze existing clusters with advanced AI analysis
 * This endpoint allows re-processing clusters that were created with basic clustering
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication with user client (reads cookies)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Use service client for database operations (bypasses RLS)
    const serviceSupabase = createServiceClient()

    // Parse body if present (optional - body may be empty)
    let cluster_id: string | undefined
    try {
      const text = await request.text()
      if (text) {
        const body = JSON.parse(text)
        cluster_id = body?.cluster_id
      }
    } catch {
      // Body is empty or invalid, continue without cluster_id
      cluster_id = undefined
    }

    // If cluster_id is provided, repair links + enrich that specific cluster
    if (cluster_id) {
      const { relinked } = await repairAndEnrichCluster(serviceSupabase, cluster_id)
      return NextResponse.json({
        success: true,
        message: 'Cluster repaired/enriched',
        relinked,
        clusters_created: 0,
        clusters_updated: 1,
      })
    }

    // Otherwise, run smart clustering on all unclustered articles
    const clusterResult = await smartClusterArticles(serviceSupabase)

    return NextResponse.json({
      success: true,
      message: 'Clustering completed',
      clusters_created: clusterResult.created,
      clusters_updated: clusterResult.updated,
    })
  } catch (error) {
    console.error('Re-analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

