import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { perplexityChatJSON } from '@/lib/ai/perplexity'

export const dynamic = 'force-dynamic'

type Sitrep24h = {
  headline: string
  executive_summary: string
  key_developments: string[]
  watchlist_24_48h: string[]
  outlook_24_48h: string[]
  confidence: { score: number; rationale: string }
}

export async function GET(request: NextRequest) {
  try {
    const language = request.nextUrl.searchParams.get('language') || 'en'
    const supabase = createClient()

    // Auth (classified tool): require analyst/admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role?: string } | null
    if (!profileData || (profileData.role !== 'admin' && profileData.role !== 'analyst')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const service = createServiceClient()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: clusters, error } = await service
      .from('clusters')
      .select(
        'id,canonical_title,summary,countries,topics,severity,confidence,article_count,updated_at'
      )
      .gte('updated_at', since)
      .order('severity', { ascending: false })
      .limit(25)

    if (error) throw new Error(`Failed to fetch clusters: ${error.message}`)

    const list = (clusters || []) as Array<{
      canonical_title: string
      summary: string | null
      countries: string[] | null
      topics: string[] | null
      severity: number | null
      confidence: number | null
      article_count: number | null
      updated_at: string
    }>
    const totals = {
      events_24h: list.length,
      high_priority: list.filter((c) => (c.severity ?? 0) >= 80).length,
      countries_unique: new Set(list.flatMap((c) => c.countries || [])).size,
      topics_unique: new Set(list.flatMap((c) => c.topics || [])).size,
    }

    const clusterText = list
      .slice(0, 20)
      .map((c, i) => {
        const countries = (c.countries || []).slice(0, 6).join(', ')
        const topics = (c.topics || []).slice(0, 6).join(', ')
        return `[${i + 1}] ${c.canonical_title}
Severity: ${c.severity ?? 0} | Confidence: ${c.confidence ?? 0} | Sources: ${c.article_count ?? 0}
Countries: ${countries || 'N/A'}
Topics: ${topics || 'N/A'}
Updated: ${c.updated_at}
Summary: ${c.summary || 'N/A'}`
      })
      .join('\n\n')

    // Mapeo de idiomas
    const languageNames: Record<string, string> = {
      es: 'Spanish',
      en: 'English',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
    }
    
    const outputLanguage = languageNames[language] || 'English'

    const system = `You are an intelligence analyst writing a CLASSIFIED 24-hour SITREP for a geopolitical command-and-control tool.
You MUST use ONLY the provided cluster data. Do NOT browse the web. Do NOT invent facts.

CRITICAL: Output ONLY valid JSON. Do NOT wrap it in markdown code blocks (no \`\`\`json or \`\`\`). Do NOT add any text before or after the JSON. Output the raw JSON object directly.

IMPORTANT: Write the entire response in ${outputLanguage}. All text fields (headline, executive_summary, key_developments, watchlist_24_48h, outlook_24_48h, confidence.rationale) must be in ${outputLanguage}.

Output STRICT JSON ONLY with this exact schema:
{
  "headline": string,
  "executive_summary": string,
  "key_developments": string[],       // 4-8 bullets
  "watchlist_24_48h": string[],       // 4-8 bullets (observable signals)
  "outlook_24_48h": string[],         // 2-6 bullets (scenario-conditional)
  "confidence": { "score": number, "rationale": string }
}
Tone: terse, governmental, operational. No investment advice.`

    const userPrompt = `SITREP window: last 24 hours.
Totals: events=${totals.events_24h}, high_priority(severity>=80)=${totals.high_priority}, unique_countries=${totals.countries_unique}, unique_topics=${totals.topics_unique}

CLUSTERS (top severity / most recent):
${clusterText}`

    const { parsed, raw } = await perplexityChatJSON<Sitrep24h>({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    })

    // Si no se pudo parsear, intentar extraer información útil del raw
    let sitrep: Sitrep24h
    if (parsed) {
      sitrep = parsed
    } else {
      // Intentar extraer al menos el headline o summary del texto crudo
      const headlineMatch = raw.match(/"headline"\s*:\s*"([^"]+)"/i) || raw.match(/headline[:\s]+(.+)/i)
      const summaryMatch = raw.match(/"executive_summary"\s*:\s*"([^"]+)"/i) || raw.match(/executive[_\s]?summary[:\s]+(.+)/i)
      
      sitrep = {
        headline: headlineMatch?.[1]?.trim() || 'SITREP (24h) - Error de formato',
        executive_summary: summaryMatch?.[1]?.trim() || 'No se pudo generar el resumen ejecutivo. El modelo devolvió un formato no válido.',
        key_developments: [],
        watchlist_24_48h: [],
        outlook_24_48h: [],
        confidence: { score: 0, rationale: 'Model did not return valid JSON. Response may contain markdown formatting.' },
      }
      
      // Log el error para debugging
      console.warn('SITREP JSON parsing failed. Raw response:', raw.substring(0, 500))
    }

    // Audit
    await service.from('audit_logs').insert({
      user_id: user.id,
      action: 'create',
      entity_type: 'overview_sitrep',
      entity_id: null,
      changes: { window: '24h', provider: 'perplexity', clusters_used: list.length },
    } as any)

    return NextResponse.json(
      {
        success: true,
        provider: 'perplexity',
        window: '24h',
        generated_at: new Date().toISOString(),
        totals,
        sitrep,
      },
      {
        headers: {
          // cache a bit (server + client); still refreshable from UI
          'Cache-Control': 'private, max-age=300',
        },
      }
    )
  } catch (error) {
    console.error('SITREP 24h error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


