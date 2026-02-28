import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { generateBriefing } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role?: string } | null }

    const profileData = profile as { role?: string } | null
    if (profileData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse body if present (optional)
    let date = new Date().toISOString().split('T')[0]
    try {
      const text = await request.text()
      if (text) {
        const body = JSON.parse(text)
        date = body?.date || date
      }
    } catch {
      // Body is empty or invalid, use default date
    }

    // Fetch recent clusters for briefing
    const serviceClient = createServiceClient()
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

    const { data: clusters, error: clustersError } = await serviceClient
      .from('clusters')
      .select(`
        id,
        canonical_title,
        summary,
        countries,
        topics,
        severity,
        confidence,
        article_count
      `)
      .gte('updated_at', twoDaysAgo)
      .order('severity', { ascending: false })
      .limit(20) as { data: Array<{ id: string; canonical_title: string; summary: string | null; countries: string[] | null; topics: string[] | null; severity: number | null; confidence: number | null; article_count: number | null }> | null; error: any }

    if (clustersError) {
      throw new Error(`Failed to fetch clusters: ${clustersError.message}`)
    }

    if (!clusters || clusters.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No recent clusters available for briefing',
      })
    }

    // Fetch articles for each cluster to get sources
    const clustersArray = clusters || []
    const clustersWithSources = await Promise.all(
      clustersArray.map(async (cluster: any) => {
        const { data: articles } = await serviceClient
          .from('articles')
          .select(`
            url,
            sources:source_id(name)
          `)
          .eq('cluster_id', cluster.id)
          .limit(5)

        const sources = articles?.map((a: { url: string; sources: unknown }) => ({
          name: (a.sources as { name: string })?.name || 'Unknown',
          url: a.url,
        })) || []

        return {
          title: cluster.canonical_title,
          summary: cluster.summary,
          countries: cluster.countries,
          topics: cluster.topics,
          severity: cluster.severity,
          sources,
        }
      })
    )

    // Generate briefing using AI (Perplexity)
    console.log(`Generating briefing for ${clustersWithSources.length} clusters...`)
    const items = await generateBriefing(clustersWithSources)

    if (items.length === 0) {
      console.error('Briefing generation returned empty items array')
      return NextResponse.json({
        success: false,
        error: 'Failed to generate briefing items. Check server logs for details. Ensure PERPLEXITY_API_KEY is configured.',
      }, { status: 500 })
    }

    console.log(`Successfully generated ${items.length} briefing items`)

    // Upsert briefing
    const { data: briefing, error: briefingError } = await serviceClient
      .from('briefings')
      .upsert(
        {
          date,
          items,
          generated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'date' }
      )
      .select()
      .single() as { data: { id: string; date: string } | null; error: any }

    if (briefingError) {
      throw new Error(`Failed to save briefing: ${briefingError.message}`)
    }

    const briefingData = briefing as { id: string; date: string } | null
    if (!briefingData) {
      throw new Error('Failed to create briefing')
    }

    // Log audit
    await serviceClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'create',
      entity_type: 'briefing',
      entity_id: briefingData.id,
      changes: { date, items_count: items.length },
    } as any)

    return NextResponse.json({
      success: true,
      briefing: {
        id: briefingData.id,
        date: briefingData.date,
        items_count: items.length,
      },
    })
  } catch (error) {
    console.error('Briefing generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

