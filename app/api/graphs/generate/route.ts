import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCausalGraphFromEvents } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role?: string } | null
    if (!profileData || profileData.role === 'reader') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { clusterIds, focus } = body

    if (!clusterIds || !Array.isArray(clusterIds) || clusterIds.length === 0) {
      return NextResponse.json({ error: 'Cluster IDs are required' }, { status: 400 })
    }

    // Fetch clusters
    const { data: clusters, error } = await supabase
      .from('clusters')
      .select('canonical_title, summary, countries, topics, severity')
      .in('id', clusterIds)

    if (error || !clusters || clusters.length === 0) {
      return NextResponse.json({ error: 'Clusters not found' }, { status: 404 })
    }

    // Generate graph
    const graph = await generateCausalGraphFromEvents(
      (clusters || []).map((c: any) => ({
        title: c.canonical_title,
        summary: c.summary || '',
        countries: c.countries || [],
        topics: c.topics || [],
      })),
      focus
    )

    return NextResponse.json({ success: true, graph })
  } catch (error) {
    console.error('Graph generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

