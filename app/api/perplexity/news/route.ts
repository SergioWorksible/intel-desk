import { NextRequest, NextResponse } from 'next/server'
import { perplexityChat } from '@/lib/ai/perplexity'

export const dynamic = 'force-dynamic'

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

export async function GET(request: NextRequest) {
  if (!PERPLEXITY_API_KEY) {
    return NextResponse.json(
      { error: 'PERPLEXITY_API_KEY not configured' },
      { status: 500 }
    )
  }

  const country = request.nextUrl.searchParams.get('country')
  const city = request.nextUrl.searchParams.get('city')
  const language = request.nextUrl.searchParams.get('language') || 'en'

  if (!country) {
    return NextResponse.json(
      { error: 'Country parameter is required' },
      { status: 400 }
    )
  }

  try {
    // Construir el prompt según si hay ciudad o no
    let locationQuery = country
    if (city) {
      locationQuery = `${city}, ${country}`
    }

    // Mapeo de idiomas para el prompt
    const languageNames: Record<string, string> = {
      es: 'Spanish',
      en: 'English',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
      zh: 'Chinese',
      ja: 'Japanese',
      ar: 'Arabic',
    }
    
    const outputLanguage = languageNames[language] || 'English'

    const prompt = `Provide a comprehensive intelligence briefing on the most important recent news and developments in ${locationQuery} from the last 24-48 hours.

IMPORTANT: Respond in ${outputLanguage}. Search for and include MULTIPLE diverse news items across different categories. Do NOT focus on just one event.

IMPORTANT: You must search for and include MULTIPLE diverse news items across different categories. Do NOT focus on just one event.

Search for and include information from ALL of these categories:
1. POLITICAL DEVELOPMENTS: Government announcements, policy changes, elections, political crises, diplomatic relations
2. ECONOMIC NEWS: Market movements, economic indicators, trade agreements, business developments, financial announcements
3. SECURITY & DEFENSE: Security incidents, military developments, defense agreements, terrorism threats
4. SOCIETAL EVENTS: Major social movements, protests, cultural events, public health developments
5. INTERNATIONAL RELATIONS: Foreign policy, international agreements, trade deals, diplomatic visits
6. BREAKING NEWS: Urgent developments, emergencies, major incidents (but include other categories too)

REQUIREMENTS:
- Include at least 5-8 different news items from multiple categories
- Each item must have a clear source citation [source name]
- Prioritize recent developments (last 24-48 hours)
- Include specific dates when available
- If a single major event dominates, still include other significant developments
- Focus on verified news from credible sources (major news outlets, official statements)

FORMAT your response as:
## Current Situation Overview
[2-3 sentence summary of the overall situation]

## Key Developments

### [Category 1: e.g., Political]
- [News item 1 with source and date]
- [News item 2 with source and date]

### [Category 2: e.g., Economic]
- [News item 1 with source and date]
- [News item 2 with source and date]

### [Category 3: e.g., Security]
- [News item 1 with source and date]

[Continue with other categories...]

## Analysis
[Brief analysis of implications and significance]

Ensure you provide a COMPREHENSIVE view, not just one incident.`

    const response = await perplexityChat({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are an expert geopolitical intelligence analyst. Your task is to provide comprehensive, multi-faceted intelligence briefings. You MUST search for and include multiple diverse news items across different categories (politics, economy, security, society, international relations). Never focus on just one event - always provide a comprehensive overview with 5-8 different news items from verified credible sources. Include specific source citations [source name] for each item.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    })

    return NextResponse.json({
      location: locationQuery,
      country,
      city: city || null,
      language,
      summary: response,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Perplexity news error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch news from Perplexity',
      },
      { status: 500 }
    )
  }
}
