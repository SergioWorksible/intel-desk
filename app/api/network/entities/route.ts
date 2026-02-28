import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/network/entities
 * Search and filter entities
 * 
 * Query params:
 * - search: search term
 * - type: filter by entity type
 * - limit: max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const searchParams = request.nextUrl.searchParams

    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase.from('entities').select('*').order('article_count', { ascending: false }).limit(limit)

    if (search) {
      query = query.or(`name.ilike.%${search}%,canonical_name.ilike.%${search}%`)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data: entities, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      entities: entities || [],
      count: entities?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching entities:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch entities',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
