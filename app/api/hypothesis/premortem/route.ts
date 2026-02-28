import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generatePremortem } from '@/lib/ai'

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
    const { hypothesisId, title, statement } = body

    if (!hypothesisId || !title || !statement) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate pre-mortem analysis
    const analysis = await generatePremortem({
      title,
      statement,
      timeframe: '6 months',
    })

    // Update hypothesis
    const serviceClient = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (serviceClient as any)
      .from('hypotheses')
      .update({ premortem_analysis: analysis })
      .eq('id', hypothesisId)

    // Log audit
    await serviceClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'update',
      entity_type: 'hypothesis',
      entity_id: hypothesisId,
      changes: { generated: 'premortem_analysis' },
    } as any)

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('Pre-mortem generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

