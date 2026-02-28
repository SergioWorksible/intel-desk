import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { ingestRSS } from '@/lib/ingest/rss'
import { smartClusterArticles } from '@/lib/ingest/smart-cluster'
import { runMLClustering } from '@/lib/ingest/ml-cluster-client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const manualTrigger = request.headers.get('x-manual-trigger')
    
    // If manual trigger, require user authentication
    if (manualTrigger) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized - Login required' }, { status: 401 })
      }
    } else {
      // Only allow cron secret for automated calls (but we're disabling automated calls)
      // Reject all non-manual calls
      return NextResponse.json({ 
        error: 'Unauthorized - Only manual triggers allowed. Use the button in the UI.' 
      }, { status: 401 })
    }

    const supabase = createServiceClient()
    const startTime = Date.now()
    const results = {
      sources_processed: 0,
      articles_fetched: 0,
      articles_new: 0,
      articles_duplicate: 0,
      clusters_created: 0,
      clusters_updated: 0,
      errors: [] as string[],
    }

    // Fetch enabled sources with RSS URLs
    const { data: allSources, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .eq('enabled', true)
      .not('rss_url', 'is', null)

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    if (!allSources || allSources.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sources to process',
        results,
      })
    }

    // Randomize sources for diversity - shuffle the array
    // This ensures we get variety instead of always processing the same sources in the same order
    const sources = [...allSources].sort(() => Math.random() - 0.5)

    // Process sources in batches to avoid blocking Supabase
    const SOURCE_BATCH_SIZE = 3 // Process 3 sources at a time
    const MAX_ARTICLES_PER_SOURCE = 25 // Limit articles per source
    
    for (let i = 0; i < sources.length; i += SOURCE_BATCH_SIZE) {
      const batch = sources.slice(i, i + SOURCE_BATCH_SIZE)
      
      // Process batch in parallel
      await Promise.all(
        batch.map(async (source) => {
          try {
            const ingestResult = await ingestRSS(supabase, source, MAX_ARTICLES_PER_SOURCE)
            results.sources_processed++
            results.articles_fetched += ingestResult.fetched
            results.articles_new += ingestResult.new
            results.articles_duplicate += ingestResult.duplicate

            // Update last_fetched_at
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('sources')
              .update({ last_fetched_at: new Date().toISOString() })
              .eq('id', (source as any).id)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            results.errors.push(`${(source as any).name}: ${message}`)
          }
        })
      )
      
      // Delay between source batches to avoid overwhelming Supabase
      if (i + SOURCE_BATCH_SIZE < sources.length) {
        await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay between batches
      }
    }

    // Run clustering on new articles
    // Primero intenta ML clustering (Python), si falla usa smart clustering (JS)
    if (results.articles_new > 0) {
      try {
        console.log(`\n📊 Iniciando clustering para ${results.articles_new} nuevos artículos...`)
        
        // Intentar ML clustering primero (más preciso)
        const mlResult = await runMLClustering({ days: 3, limit: 300 })
        
        if (mlResult) {
          // ML clustering exitoso
          results.clusters_created = mlResult.created || 0
          results.clusters_updated = mlResult.updated || 0
          console.log(`✅ Clustering ML completado: ${results.clusters_created} creados, ${results.clusters_updated} actualizados`)
        } else {
          // Fallback a smart clustering si ML no está disponible
          console.log('⚠️  Servicio ML no disponible, usando clustering básico (smart clustering)...')
          try {
            const clusterResult = await smartClusterArticles(supabase)
            results.clusters_created = clusterResult.created || 0
            results.clusters_updated = clusterResult.updated || 0
            console.log(`✅ Clustering básico completado: ${results.clusters_created} creados, ${results.clusters_updated} actualizados`)
          } catch (fallbackError) {
            const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
            console.error('❌ Error en clustering básico:', fallbackMessage)
            results.errors.push(`Clustering básico: ${fallbackMessage}`)
          }
        }

        // Auto-link new clusters to market symbols using AI (async, non-blocking)
        if (results.clusters_created > 0 && process.env.OPENAI_API_KEY) {
          // Start auto-linking in background without awaiting
          autoLinkClustersToMarkets(supabase, results.clusters_created).catch((error: unknown) => {
            console.error('Background auto-linking error:', error)
          })
        } else if (results.clusters_created > 0) {
          console.log('ℹ️  Auto-linking de clusters a símbolos de mercado omitido (OPENAI_API_KEY no configurada)')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('❌ Error general en clustering:', message)
        results.errors.push(`Clustering: ${message}`)
      }
    } else {
      console.log('ℹ️  No hay nuevos artículos para clusterizar')
    }

    const duration = Date.now() - startTime

    // Log to audit
    await supabase.from('audit_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000', // System user
      action: 'create',
      entity_type: 'ingest_run',
      entity_id: crypto.randomUUID(),
      changes: { ...results, duration_ms: duration },
    } as any)

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      results,
    })
  } catch (error) {
    console.error('Ingest error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also allow manual GET for testing
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: {
      ...Object.fromEntries(request.headers),
      'x-manual-trigger': 'true',
    },
  }))
}

/**
 * Auto-link clusters to market symbols in background (non-blocking)
 */
async function autoLinkClustersToMarkets(
  supabase: ReturnType<typeof createServiceClient>,
  clusterCount: number
) {
  try {
    console.log('Auto-linking new clusters to market symbols...')
    // Import and call the auto-link function directly
    const { generateMarketEventLinks } = await import('@/lib/ai/markets')
    
    // Get newly created clusters
    const { data: newClusters } = await supabase
      .from('clusters')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(clusterCount)
    
    if (newClusters && newClusters.length > 0) {
      // Get all active symbols
      const { data: symbols } = await supabase
        .from('market_symbols')
        .select('*')
        .eq('is_active', true)
      
      if (symbols && symbols.length > 0) {
        let linksCreated = 0
        for (const cluster of newClusters) {
          const relevantSymbols = await generateMarketEventLinks(cluster, symbols)
          
          for (const symbolLink of relevantSymbols) {
            const symbol = symbols.find((s: { symbol: string }) => s.symbol === symbolLink.symbol)
            if (!symbol) continue
            
            // Check if link exists
            const { data: existing } = await supabase
              .from('market_event_links')
              .select('id')
              .eq('symbol_id', (symbol as any).id)
              .eq('cluster_id', (cluster as any).id)
              .single()
            
            if (!existing) {
              await supabase.from('market_event_links').insert({
                symbol_id: (symbol as any).id,
                cluster_id: (cluster as any).id,
                rationale: symbolLink.rationale,
                impact_assessment: symbolLink.impact_assessment,
              } as any)
              linksCreated++
            }
          }
        }
        console.log(`Auto-linked ${linksCreated} market symbols to events`)
      }
    }
  } catch (linkError) {
    console.error('Auto-linking failed (non-critical):', linkError)
    // Don't fail the whole ingest if auto-linking fails
  }
}

