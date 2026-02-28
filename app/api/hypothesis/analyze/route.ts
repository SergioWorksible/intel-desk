import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateHypothesisAnalysis } from '@/lib/ai'

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
    const { hypothesisId, title, statement, assumptions, language } = body
    
    // Validate language, default to Spanish
    const validLanguage = language === 'en' ? 'en' : 'es'

    let hypothesis: any = null
    let evidence: string[] = []

    if (hypothesisId) {
      // Fetch existing hypothesis
      const { data, error } = await supabase
        .from('hypotheses')
        .select('*')
        .eq('id', hypothesisId)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 })
      }

      hypothesis = data

      // Fetch linked clusters as evidence
      if (hypothesis.linked_cluster_ids?.length) {
        const { data: clusters } = await supabase
          .from('clusters')
          .select('canonical_title, summary')
          .in('id', hypothesis.linked_cluster_ids) as { data: Array<{ canonical_title: string; summary: string | null }> | null }

        (clusters || []).forEach((c: any) => {
          if (c.summary) evidence.push(c.summary)
          else evidence.push(c.canonical_title)
        })
      }
    } else {
      // New hypothesis - use provided data
      if (!title || !statement) {
        return NextResponse.json({ error: 'Title and statement are required' }, { status: 400 })
      }
      hypothesis = { title, statement, assumptions: assumptions || [] }
    }

    // Generate analysis
    const analysis = await generateHypothesisAnalysis(
      {
        title: hypothesis.title,
        statement: hypothesis.statement,
        assumptions: (hypothesis.assumptions as string[]) || [],
      },
      evidence,
      validLanguage
    )

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('Hypothesis analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

