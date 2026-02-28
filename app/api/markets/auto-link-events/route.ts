import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateMarketEventLinks } from '@/lib/ai/markets'

export const dynamic = 'force-dynamic'

/**
 * Automatically link geopolitical events (clusters) to relevant market symbols using AI
 * This should be called periodically or when new clusters are created
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or analyst
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role?: string } | null
    if (!profileData || (profileData.role !== 'admin' && profileData.role !== 'analyst')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { clusterId, autoLinkAll } = body

    const results = {
      links_created: 0,
      links_skipped: 0,
      errors: [] as string[],
    }

    // Use service client for data operations
    const serviceSupabase = createServiceClient()

    // Get clusters to process
    let clusters: any[] = []
    
    if (clusterId) {
      // Process specific cluster
      const { data: cluster, error } = await serviceSupabase
        .from('clusters')
        .select('*')
        .eq('id', clusterId)
        .single()

      if (error) throw error
      if (cluster) clusters = [cluster]
    } else if (autoLinkAll) {
      // Process recent clusters (last 7 days) that don't have links yet
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data: allClusters, error } = await serviceSupabase
        .from('clusters')
        .select('*')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      
      // Filter out clusters that already have links
      const { data: existingLinks } = await serviceSupabase
        .from('market_event_links')
        .select('cluster_id') as { data: Array<{ cluster_id: string }> | null }
      
      const linkedClusterIds = new Set((existingLinks || []).map((l: any) => l.cluster_id))
      clusters = (allClusters || []).filter((c: any) => !linkedClusterIds.has(c.id))
    } else {
      return NextResponse.json({ error: 'clusterId or autoLinkAll required' }, { status: 400 })
    }

    if (clusters.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No clusters to process',
        results,
      })
    }

    // Get all active market symbols
    const { data: symbols, error: symbolsError } = await serviceSupabase
      .from('market_symbols')
      .select('*')
      .eq('is_active', true)

    if (symbolsError) {
      throw new Error(`Failed to fetch symbols: ${symbolsError.message}`)
    }

    if (!symbols || symbols.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No symbols available',
        results,
      })
    }

    // Process each cluster
    for (const cluster of clusters) {
      try {
        // Use AI to determine which symbols are relevant
        const relevantSymbols = await generateMarketEventLinks(cluster, symbols)

        // Create links for relevant symbols
        for (const symbolLink of relevantSymbols) {
          const symbol = (symbols || []).find((s: any) => s.symbol === symbolLink.symbol)
          if (!symbol) continue

          // Check if link already exists
          const { data: existing } = await serviceSupabase
            .from('market_event_links')
            .select('id')
            .eq('symbol_id', (symbol as any).id)
            .eq('cluster_id', (cluster as any).id)
            .single()

          if (existing) {
            results.links_skipped++
            continue
          }

          // Create link
          const { error: linkError } = await serviceSupabase
            .from('market_event_links')
            .insert({
              symbol_id: (symbol as any).id,
              cluster_id: (cluster as any).id,
              rationale: symbolLink.rationale,
              impact_assessment: symbolLink.impact_assessment,
            } as any)

          if (linkError) {
            results.errors.push(`${cluster.canonical_title} -> ${symbolLink.symbol}: ${linkError.message}`)
          } else {
            results.links_created++
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`${cluster.canonical_title}: ${message}`)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      clusters_processed: clusters.length,
    })
  } catch (error) {
    console.error('Auto-link events error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

