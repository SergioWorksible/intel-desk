import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()

  try {
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      return NextResponse.json({
        error: 'Auth error',
        details: authError,
        authenticated: false
      }, { status: 401 })
    }

    // Check countries
    const { data: countries, error: countriesError, count: countriesCount } = await supabase
      .from('countries')
      .select('*', { count: 'exact' })
      .limit(5)

    // Check clusters
    const { data: clusters, error: clustersError, count: clustersCount } = await supabase
      .from('clusters')
      .select('*', { count: 'exact' })
      .limit(5)

    // Check articles
    const { data: articles, error: articlesError, count: articlesCount } = await supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .limit(5)

    return NextResponse.json({
      authenticated: !!user,
      user: user ? { id: user.id, email: user.email } : null,
      countries: {
        count: countriesCount,
        error: countriesError,
        sample: countries?.slice(0, 3).map((c: any) => c.name)
      },
      clusters: {
        count: clustersCount,
        error: clustersError,
        sample: clusters?.slice(0, 3).map((c: any) => c.canonical_title)
      },
      articles: {
        count: articlesCount,
        error: articlesError
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error
    }, { status: 500 })
  }
}

