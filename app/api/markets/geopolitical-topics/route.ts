import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get clusters linked to market symbols with their topics
    const { data: eventLinks, error } = await supabase
      .from('market_event_links')
      .select(`
        id,
        symbol_id,
        rationale,
        impact_assessment,
        clusters (
          id,
          canonical_title,
          topics,
          countries,
          severity,
          confidence,
          updated_at
        ),
        market_symbols (
          id,
          symbol,
          name,
          type,
          sector,
          country
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      throw error
    }

    // Group by topics
    const topicsMap: Record<string, {
      topic: string
      symbols: any[]
      clusters: any[]
      severity: number
      count: number
    }> = {}

    eventLinks?.forEach((link: any) => {
      const cluster = link.clusters
      const symbol = link.market_symbols
      
      if (!cluster || !symbol) return

      const clusterTopics = cluster.topics || []
      
      clusterTopics.forEach((topic: string) => {
        if (!topicsMap[topic]) {
          topicsMap[topic] = {
            topic,
            symbols: [],
            clusters: [],
            severity: 0,
            count: 0,
          }
        }

        // Add symbol with rationale and impact if not already present
        const existingSymbol = topicsMap[topic].symbols.find((s: any) => s.id === symbol.id)
        if (!existingSymbol) {
          topicsMap[topic].symbols.push({
            id: symbol.id,
            symbol: symbol.symbol,
            name: symbol.name,
            type: symbol.type,
            sector: symbol.sector,
            country: symbol.country,
            rationale: link.rationale,
            impact_assessment: link.impact_assessment,
          })
        } else {
          // If symbol already exists, merge rationale if available
          if (link.rationale && !existingSymbol.rationale) {
            existingSymbol.rationale = link.rationale
          }
          if (link.impact_assessment && !existingSymbol.impact_assessment) {
            existingSymbol.impact_assessment = link.impact_assessment
          }
        }

        // Add cluster if not already present
        if (!topicsMap[topic].clusters.find((c: any) => c.id === cluster.id)) {
          topicsMap[topic].clusters.push({
            id: cluster.id,
            title: cluster.canonical_title,
            severity: cluster.severity,
            countries: cluster.countries,
          })
        }

        topicsMap[topic].severity = Math.max(topicsMap[topic].severity, cluster.severity)
        topicsMap[topic].count++
      })
    })

    // Convert to array and sort by severity
    const topics = Object.values(topicsMap)
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 20)

    return NextResponse.json({
      success: true,
      topics,
    })
  } catch (error) {
    console.error('Geopolitical topics error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

