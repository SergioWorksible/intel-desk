import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePlaybook } from '@/lib/ai'

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
    const { actorType, objective, clusterIds, hypothesisIds, language } = body

    if (!actorType || !objective) {
      return NextResponse.json({ error: 'Actor type and objective are required' }, { status: 400 })
    }

    // Validate language, default to Spanish
    const validLanguage = language === 'en' ? 'en' : 'es'

    // Fetch context if provided
    let context: any = {}
    if (clusterIds?.length) {
      const { data: clusters } = await supabase
        .from('clusters')
        .select('canonical_title, summary, countries, topics, severity')
        .in('id', clusterIds)
      context.clusters = clusters || []
    }

    if (hypothesisIds?.length) {
      const { data: hypotheses } = await supabase
        .from('hypotheses')
        .select('title, prob_current, statement')
        .in('id', hypothesisIds)
      context.hypotheses = hypotheses || []
    }

    // Generate playbook
    const playbook = await generatePlaybook(actorType, objective, context, validLanguage)

    return NextResponse.json({ success: true, playbook })
  } catch (error) {
    console.error('Playbook generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

