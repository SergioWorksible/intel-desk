import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const CACHE_DURATION_HOURS = 24

interface CountryIntelCache {
  id: string
  country_code: string
  intel_data: {
    summary: string
    recentNews: Array<{ title: string; source: string; date: string }>
    keyFigures: Array<{ name: string; role: string }>
    economicIndicators: { gdp: string; inflation: string; unemployment: string }
    geopoliticalContext: string
    riskFactors: string[]
    alliances: string[]
    conflicts: string[]
  }
  updated_at: string
}

// Fallback to OpenAI if Perplexity is not available
async function fetchOpenAIIntel(countryName: string, countryCode: string) {
  if (!OPENAI_API_KEY) {
    throw new Error('No AI provider configured')
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

  const prompt = `Provide a geopolitical intelligence briefing for ${countryName} (${countryCode}).

Return ONLY a JSON object with these keys:
{
  "summary": "2-3 sentence overview of current situation",
  "recentNews": [{"title": "headline", "source": "source name", "date": "date"}],
  "keyFigures": [{"name": "person name", "role": "their role"}],
  "economicIndicators": {"gdp": "X%", "inflation": "X%", "unemployment": "X%"},
  "geopoliticalContext": "description of alliances and tensions",
  "riskFactors": ["risk 1", "risk 2"],
  "alliances": ["alliance 1", "alliance 2"],
  "conflicts": ["conflict 1"]
}

Include 3-5 recent news items based on your knowledge. Return ONLY valid JSON.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  })

  const content = response.choices?.[0]?.message?.content || '{}'
  return JSON.parse(content)
}

async function fetchPerplexityIntel(countryName: string, countryCode: string) {
  if (!PERPLEXITY_API_KEY) {
    // Try OpenAI as fallback
    console.log('Perplexity not configured, trying OpenAI...')
    return fetchOpenAIIntel(countryName, countryCode)
  }

  const prompt = `Provide a geopolitical intelligence briefing for ${countryName} (${countryCode}).

Return ONLY a JSON object with these keys:
{
  "summary": "2-3 sentence overview of current situation",
  "recentNews": [{"title": "headline", "source": "source name", "date": "date"}],
  "keyFigures": [{"name": "person name", "role": "their role"}],
  "economicIndicators": {"gdp": "X%", "inflation": "X%", "unemployment": "X%"},
  "geopoliticalContext": "description of alliances and tensions",
  "riskFactors": ["risk 1", "risk 2"],
  "alliances": ["alliance 1", "alliance 2"],
  "conflicts": ["conflict 1"]
}

Include 3-5 recent news items. Return ONLY valid JSON, no markdown.`

  const requestBody = {
    model: 'sonar',  // Updated to current Perplexity model
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 1500,
  }

  console.log('Perplexity request:', JSON.stringify(requestBody, null, 2))

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Perplexity API error response:', errorText)
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  console.log('Perplexity raw response:', content.substring(0, 500))

  // Extract JSON from response - handle markdown code blocks
  let jsonStr = content
  
  // Remove markdown code blocks if present
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1]
  } else {
    // Try to find raw JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }
  }

  try {
    return JSON.parse(jsonStr.trim())
  } catch (parseError) {
    console.error('JSON parse error:', parseError, 'Content:', jsonStr.substring(0, 200))
    throw new Error('Failed to parse Perplexity response as JSON')
  }
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  
  const countryCode = request.nextUrl.searchParams.get('code')
  
  if (!countryCode) {
    return NextResponse.json({ error: 'Country code required' }, { status: 400 })
  }

  // Country names fallback
  const countryNames: Record<string, string> = {
    'US': 'Estados Unidos', 'CN': 'China', 'RU': 'Rusia', 'GB': 'Reino Unido', 'DE': 'Alemania',
    'FR': 'Francia', 'JP': 'Japón', 'IN': 'India', 'BR': 'Brasil', 'AU': 'Australia',
    'CA': 'Canadá', 'KR': 'Corea del Sur', 'SA': 'Arabia Saudita', 'IR': 'Irán', 'IL': 'Israel',
    'TR': 'Turquía', 'UA': 'Ucrania', 'PL': 'Polonia', 'TW': 'Taiwán', 'MX': 'México',
    'ID': 'Indonesia', 'EG': 'Egipto', 'ZA': 'Sudáfrica', 'NG': 'Nigeria', 'PK': 'Pakistán',
    'KP': 'Corea del Norte', 'VE': 'Venezuela', 'AF': 'Afganistán', 'SY': 'Siria', 'YE': 'Yemen',
    'ES': 'España', 'IT': 'Italia', 'NL': 'Países Bajos', 'BE': 'Bélgica', 'CH': 'Suiza',
    'AT': 'Austria', 'SE': 'Suecia', 'NO': 'Noruega', 'DK': 'Dinamarca', 'FI': 'Finlandia',
    'GR': 'Grecia', 'PT': 'Portugal', 'IE': 'Irlanda', 'CZ': 'Chequia', 'HU': 'Hungría',
    'RO': 'Rumanía', 'BG': 'Bulgaria', 'RS': 'Serbia', 'HR': 'Croacia', 'SK': 'Eslovaquia',
    'SI': 'Eslovenia', 'LT': 'Lituania', 'LV': 'Letonia', 'EE': 'Estonia', 'BY': 'Bielorrusia',
    'MD': 'Moldavia', 'GE': 'Georgia', 'AM': 'Armenia', 'AZ': 'Azerbaiyán', 'KZ': 'Kazajistán',
    'SS': 'Sudán del Sur', 'ER': 'Eritrea', 'SO': 'Somalia', 'XK': 'Kosovo', 'PS': 'Palestina',
  }

  try {
    // Get country info from database
    const { data: dbCountry, error: countryError } = await supabase
      .from('countries')
      .select('*')
      .eq('code', countryCode)
      .single()

    // Create a fallback country object if not in database
    const country = dbCountry || {
      code: countryCode,
      name: countryNames[countryCode] || countryCode,
      region: 'Unknown',
      watchlist: false,
    }

    // Check for cached intel
    const { data: cachedIntel } = await supabase
      .from('country_intel_cache')
      .select('*')
      .eq('country_code', countryCode)
      .single() as { data: { updated_at: string; intel_data: any } | null }

    const cachedIntelData = cachedIntel as { updated_at: string; intel_data: any } | null
    const now = new Date()
    const cacheExpiry = cachedIntelData 
      ? new Date(new Date(cachedIntelData.updated_at).getTime() + CACHE_DURATION_HOURS * 60 * 60 * 1000)
      : null

    // Return cached data if still valid
    if (cachedIntelData && cacheExpiry && now < cacheExpiry) {
      console.log(`Using cached intel for ${countryCode}`)
      return NextResponse.json({
        country,
        intel: cachedIntelData.intel_data,
        cached: true,
        cachedAt: cachedIntelData.updated_at,
        expiresAt: cacheExpiry.toISOString(),
      })
    }

    // Fetch fresh intel from Perplexity
    console.log(`Fetching fresh intel for ${countryCode}`)
    
    let intelData
    try {
      intelData = await fetchPerplexityIntel(country.name, countryCode)
    } catch (error) {
      console.error('Perplexity error:', error)
      
      // Return cached data even if expired, or fallback
      if (cachedIntelData) {
        return NextResponse.json({
          country,
          intel: cachedIntelData.intel_data,
          cached: true,
          stale: true,
          cachedAt: cachedIntelData.updated_at,
          error: 'Could not refresh intel, using stale cache',
        })
      }

      // Return basic fallback data
      const countryData = country as { name: string; government_type?: string; region: string; leader_name?: string; leader_title?: string; overview?: string }
      intelData = {
        summary: `${countryData.name} is a ${countryData.government_type || 'nation'} located in ${countryData.region}.`,
        recentNews: [],
        keyFigures: countryData.leader_name ? [{ name: countryData.leader_name, role: countryData.leader_title || 'Leader' }] : [],
        economicIndicators: { gdp: 'N/A', inflation: 'N/A', unemployment: 'N/A' },
        geopoliticalContext: countryData.overview || 'No recent geopolitical context available.',
        riskFactors: [],
        alliances: [],
        conflicts: [],
      }
    }

    // Cache the new intel
    const { error: upsertError } = await supabase
      .from('country_intel_cache')
      .upsert({
        country_code: countryCode,
        intel_data: intelData,
        updated_at: now.toISOString(),
      } as any, {
        onConflict: 'country_code',
      })

    if (upsertError) {
      console.error('Cache upsert error:', upsertError)
    }

    return NextResponse.json({
      country,
      intel: intelData,
      cached: false,
      fetchedAt: now.toISOString(),
    })

  } catch (error) {
    console.error('Country intel error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch country intel' },
      { status: 500 }
    )
  }
}

