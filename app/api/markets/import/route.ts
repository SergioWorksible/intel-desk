import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchSymbols, getCompanyProfile } from '@/lib/markets/finnhub'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or analyst
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role?: string } | null
    if (!profileData || (profileData.role !== 'admin' && profileData.role !== 'analyst')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { symbols, type } = body

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'symbols array is required' }, { status: 400 })
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    }

    // Process each symbol
    for (const symbolInput of symbols) {
      try {
        const symbolStr = typeof symbolInput === 'string' ? symbolInput.trim() : symbolInput.symbol?.trim()
        if (!symbolStr) {
          results.skipped++
          continue
        }

        // Check if symbol already exists
        const { data: existing } = await supabase
          .from('market_symbols')
          .select('id')
          .eq('symbol', symbolStr.toUpperCase())
          .single()

        if (existing) {
          results.skipped++
          continue
        }

        // Try to get company profile for additional info
        let profile = null
        if (type === 'stock' || !type) {
          profile = await getCompanyProfile(symbolStr)
        }

        // Determine symbol type if not provided
        let symbolType = type || 'stock'
        if (!type && profile) {
          symbolType = 'stock'
        }

        // Insert symbol
        const symbolData: any = {
          symbol: symbolStr.toUpperCase(),
          name: profile?.name || symbolStr,
          type: symbolType,
          currency: profile?.currency || 'USD',
          exchange: profile?.exchange || null,
          sector: profile?.finnhubIndustry || null,
          country: profile?.country || null,
          is_active: true,
        }

        const { error: insertError } = await supabase
          .from('market_symbols')
          .insert(symbolData)

        if (insertError) {
          results.errors.push(`${symbolStr}: ${insertError.message}`)
        } else {
          results.imported++
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`${symbolInput}: ${message}`)
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Symbol import error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

