import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateRedTeam } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can edit
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
    const { hypothesisId, title, statement, assumptions } = body

    if (!hypothesisId || !title || !statement) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch related evidence from clusters
    const { data: hypothesis } = await supabase
      .from('hypotheses')
      .select('linked_cluster_ids')
      .eq('id', hypothesisId)
      .single() as { data: { linked_cluster_ids?: string[] } | null }

    const evidence: string[] = []
    const hypothesisData = hypothesis as { linked_cluster_ids?: string[] } | null
    if (hypothesisData?.linked_cluster_ids?.length) {
      const { data: clusters } = await supabase
        .from('clusters')
        .select('canonical_title, summary')
        .in('id', hypothesisData.linked_cluster_ids) as { data: Array<{ canonical_title: string; summary: string | null }> | null }

      (clusters || []).forEach((c: any) => {
        if (c.summary) evidence.push(c.summary)
        else evidence.push(c.canonical_title)
      })
    }

    // Generate red team analysis
    const analysis = await generateRedTeam({
      title,
      statement,
      assumptions: assumptions || [],
      evidence,
    })

    // Update hypothesis
    const serviceClient = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (serviceClient as any)
      .from('hypotheses')
      .update({ red_team_analysis: analysis })
      .eq('id', hypothesisId)

    // Log audit
    await serviceClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'update',
      entity_type: 'hypothesis',
      entity_id: hypothesisId,
      changes: { generated: 'red_team_analysis' },
    } as any)

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('Red team generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

