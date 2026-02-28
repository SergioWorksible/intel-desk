import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { runMLClustering } from '@/lib/ingest/ml-cluster-client'
import { smartClusterArticles } from '@/lib/ingest/smart-cluster'

export const dynamic = 'force-dynamic'

/**
 * Cluster unclustered articles manually
 * Tries ML clustering first, falls back to smart clustering
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Use service client for database operations
    const serviceSupabase = createServiceClient()

    // Parse optional parameters
    let days = 7
    let limit = 500
    try {
      const text = await request.text()
      if (text) {
        const body = JSON.parse(text)
        days = body.days || 7
        limit = body.limit || 500
      }
    } catch {
      // Use defaults
    }

    console.log(`📊 Clustering artículos sin cluster (últimos ${days} días, límite ${limit})...`)

    // First, check how many unclustered articles exist
    const { count: unclusteredCount } = await serviceSupabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .is('cluster_id', null)
      .gte('published_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

    if (!unclusteredCount || unclusteredCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay artículos sin cluster para procesar',
        clusters_created: 0,
        clusters_updated: 0,
        articles_processed: 0,
      })
    }

    console.log(`   Encontrados ${unclusteredCount} artículos sin cluster`)

    // Try ML clustering first (more accurate)
    console.log('   Intentando clustering ML (Python)...')
    const mlResult = await runMLClustering({ days, limit })
    
    if (mlResult) {
      // ML clustering successful
      return NextResponse.json({
        success: true,
        message: 'Clustering ML completado',
        method: 'ml',
        clusters_created: mlResult.created || 0,
        clusters_updated: mlResult.updated || 0,
        duplicates: mlResult.duplicates || 0,
        outliers: mlResult.outliers || 0,
        processed: mlResult.processed || 0,
        articles_processed: mlResult.processed || 0,
      })
    }

    // Fallback to smart clustering
    console.log('   ML no disponible, usando clustering básico...')
    const clusterResult = await smartClusterArticles(serviceSupabase)

    return NextResponse.json({
      success: true,
      message: 'Clustering básico completado',
      method: 'smart',
      clusters_created: clusterResult.created || 0,
      clusters_updated: clusterResult.updated || 0,
      articles_processed: unclusteredCount,
    })
  } catch (error) {
    console.error('Clustering error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
