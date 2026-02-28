import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateResearchAnswer, generateAdvancedResearch } from '@/lib/ai'
import { perplexityChat } from '@/lib/ai/perplexity'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, filters, usePerplexity = true, conversationHistory = [] } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Search for relevant articles using full-text search
    const rpcCall = (supabase.rpc as any)('search_articles', {
      query_text: query,
      limit_count: 30,
    }) as Promise<{ data: Array<{ title: string; snippet: string | null; source_name: string; url: string }> | null; error: any }>
    const { data: articles, error: searchError } = await rpcCall

    if (searchError) {
      console.error('Search error:', searchError)
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      )
    }

    // Also search clusters, hypotheses, and playbooks
    const { data: clusters } = await supabase
      .from('clusters')
      .select('canonical_title, summary, countries, topics, severity, confidence, id')
      .or(`canonical_title.ilike.%${query}%,summary.ilike.%${query}%`)
      .limit(15) as { data: Array<{ canonical_title: string; summary: string | null; countries: string[] | null; topics: string[] | null; severity: number | null; confidence: number | null; id: string }> | null }

    const { data: hypotheses } = await supabase
      .from('hypotheses')
      .select('title, statement, prob_current, status')
      .or(`title.ilike.%${query}%,statement.ilike.%${query}%`)
      .limit(10) as { data: Array<{ title: string; statement: string; prob_current: number | null; status: string }> | null }

    const { data: playbooks } = await supabase
      .from('playbooks')
      .select('title, objective, actor_type')
      .or(`title.ilike.%${query}%,objective.ilike.%${query}%`)
      .limit(10) as { data: Array<{ title: string; objective: string; actor_type: string }> | null }

    // Build context for AI
    const context = [
      // Articles context
      ...(articles || []).map((a) => ({
        title: a.title,
        content: a.snippet || '',
        source: a.source_name,
        url: a.url,
      })),
      // Clusters context
      ...(clusters || []).map((c: any) => ({
        title: c.canonical_title,
        content: c.summary || `Event involving ${(c.countries || []).join(', ')}. Topics: ${(c.topics || []).join(', ')}. Severity: ${c.severity || 0}/100.`,
        source: 'Intel Desk Cluster',
        url: '',
      })),
      // Hypotheses context
      ...(hypotheses || []).map((h) => ({
        title: `Hypothesis: ${h.title}`,
        content: h.statement,
        source: 'Intel Desk Hypothesis',
        url: '',
      })),
      // Playbooks context
      ...(playbooks || []).map((p) => ({
        title: `Playbook: ${p.title}`,
        content: p.objective,
        source: 'Intel Desk Playbook',
        url: '',
      })),
    ]

    // Use Perplexity for real-time web research if enabled
    let perplexityContext = ''
    if (usePerplexity && process.env.PERPLEXITY_API_KEY) {
      try {
        const perplexityPrompt = `You are an intelligence analyst. Research the following query and provide current, verified information with sources: "${query}"

Focus on:
- Recent developments and current status
- Verified facts from credible sources
- Geopolitical implications
- Key actors and stakeholders
- Timeline of events

Provide a comprehensive research summary with citations.`

        perplexityContext = await perplexityChat({
          model: 'sonar-pro',
          messages: [
            { role: 'system', content: 'You are an expert geopolitical intelligence analyst. Provide accurate, cited information.' },
            { role: 'user', content: perplexityPrompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        })
      } catch (error) {
        console.error('Perplexity error:', error)
        // Continue without Perplexity context
      }
    }

    // Generate enhanced AI response with conversation history
    const response = await generateAdvancedResearch(
      query,
      context,
      perplexityContext,
      conversationHistory
    )

    // Save research query to database
    try {
      await supabase.from('research_queries').insert({
        user_id: user.id,
        query,
        filters: filters || {},
        response,
        used_perplexity: usePerplexity,
      } as any)
    } catch (error) {
      // Table might not exist, continue anyway
      console.warn('Could not save research query:', error)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Research answer error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

