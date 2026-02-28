import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in environment')
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
  process.exit(1)
}

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in environment')
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkDB() {
  console.log('🔍 Checking database...')
  console.log('URL:', supabaseUrl)
  console.log('Key:', (supabaseAnonKey?.substring(0, 20) || '') + '...' || 'N/A')

  // Check countries
  console.log('\n📍 Checking countries table...')
  const { data: countries, error: countriesError, count: countriesCount } = await supabase
    .from('countries')
    .select('*', { count: 'exact' })
    .limit(5)

  if (countriesError) {
    console.error('❌ Error fetching countries:', countriesError)
  } else {
    console.log(`✅ Found ${countriesCount} countries`)
    console.log('Sample:', countries?.slice(0, 3).map(c => c.name).join(', '))
  }

  // Check clusters
  console.log('\n🔴 Checking clusters table...')
  const { data: clusters, error: clustersError, count: clustersCount } = await supabase
    .from('clusters')
    .select('*', { count: 'exact' })
    .limit(5)

  if (clustersError) {
    console.error('❌ Error fetching clusters:', clustersError)
  } else {
    console.log(`✅ Found ${clustersCount} clusters`)
    console.log('Sample:', clusters?.slice(0, 3).map(c => c.canonical_title).join(', '))
  }

  // Check articles
  console.log('\n📰 Checking articles table...')
  const { data: articles, error: articlesError, count: articlesCount } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .limit(5)

  if (articlesError) {
    console.error('❌ Error fetching articles:', articlesError)
  } else {
    console.log(`✅ Found ${articlesCount} articles`)
  }

  // Check auth
  console.log('\n👤 Checking authentication...')
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    console.error('❌ Auth error:', authError)
  } else if (user) {
    console.log('✅ User authenticated:', user.email)
  } else {
    console.log('⚠️  No user authenticated (using anon key)')
  }

  console.log('\n✨ Check complete!')
}

checkDB()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Error:', error)
    process.exit(1)
  })

