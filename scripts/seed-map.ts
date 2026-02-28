import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedMap() {
  console.log('🌍 Seeding map data...')

  // Seed countries
  const countries = [
    { code: 'US', name: 'Estados Unidos', region: 'Americas', subregion: 'North America', capital: 'Washington, D.C.', population: 331000000, government_type: 'República federal presidencial', watchlist: true },
    { code: 'CN', name: 'China', region: 'Asia', subregion: 'East Asia', capital: 'Beijing', population: 1400000000, government_type: 'República socialista', watchlist: true },
    { code: 'RU', name: 'Rusia', region: 'Europe', subregion: 'Eastern Europe', capital: 'Moscow', population: 144000000, government_type: 'República semi-presidencial', watchlist: true },
    { code: 'GB', name: 'Reino Unido', region: 'Europe', subregion: 'Northern Europe', capital: 'London', population: 67000000, government_type: 'Monarquía constitucional', watchlist: true },
    { code: 'DE', name: 'Alemania', region: 'Europe', subregion: 'Western Europe', capital: 'Berlin', population: 83000000, government_type: 'República parlamentaria', watchlist: false },
    { code: 'FR', name: 'Francia', region: 'Europe', subregion: 'Western Europe', capital: 'Paris', population: 67000000, government_type: 'República semi-presidencial', watchlist: true },
    { code: 'JP', name: 'Japón', region: 'Asia', subregion: 'East Asia', capital: 'Tokyo', population: 126000000, government_type: 'Monarquía constitucional', watchlist: false },
    { code: 'IN', name: 'India', region: 'Asia', subregion: 'South Asia', capital: 'New Delhi', population: 1380000000, government_type: 'República parlamentaria', watchlist: true },
    { code: 'BR', name: 'Brasil', region: 'Americas', subregion: 'South America', capital: 'Brasília', population: 212000000, government_type: 'República presidencial', watchlist: false },
    { code: 'AU', name: 'Australia', region: 'Oceania', subregion: 'Australia and New Zealand', capital: 'Canberra', population: 25600000, government_type: 'Monarquía constitucional', watchlist: false },
    { code: 'CA', name: 'Canadá', region: 'Americas', subregion: 'North America', capital: 'Ottawa', population: 38000000, government_type: 'Monarquía constitucional', watchlist: false },
    { code: 'KR', name: 'Corea del Sur', region: 'Asia', subregion: 'East Asia', capital: 'Seoul', population: 51700000, government_type: 'República presidencial', watchlist: true },
    { code: 'SA', name: 'Arabia Saudita', region: 'Asia', subregion: 'Western Asia', capital: 'Riyadh', population: 34800000, government_type: 'Monarquía absoluta', watchlist: true },
    { code: 'IR', name: 'Irán', region: 'Asia', subregion: 'Western Asia', capital: 'Tehran', population: 83900000, government_type: 'República islámica', watchlist: true },
    { code: 'IL', name: 'Israel', region: 'Asia', subregion: 'Western Asia', capital: 'Jerusalem', population: 9200000, government_type: 'República parlamentaria', watchlist: true },
    { code: 'TR', name: 'Turquía', region: 'Asia', subregion: 'Western Asia', capital: 'Ankara', population: 84300000, government_type: 'República presidencial', watchlist: true },
    { code: 'UA', name: 'Ucrania', region: 'Europe', subregion: 'Eastern Europe', capital: 'Kyiv', population: 44100000, government_type: 'República semi-presidencial', watchlist: true },
    { code: 'PL', name: 'Polonia', region: 'Europe', subregion: 'Central Europe', capital: 'Warsaw', population: 38400000, government_type: 'República parlamentaria', watchlist: false },
    { code: 'TW', name: 'Taiwán', region: 'Asia', subregion: 'East Asia', capital: 'Taipei', population: 23800000, government_type: 'República semi-presidencial', watchlist: true },
    { code: 'MX', name: 'México', region: 'Americas', subregion: 'Central America', capital: 'Mexico City', population: 128900000, government_type: 'República presidencial', watchlist: false },
    { code: 'ID', name: 'Indonesia', region: 'Asia', subregion: 'Southeast Asia', capital: 'Jakarta', population: 273500000, government_type: 'República presidencial', watchlist: false },
    { code: 'EG', name: 'Egipto', region: 'Africa', subregion: 'Northern Africa', capital: 'Cairo', population: 102300000, government_type: 'República semi-presidencial', watchlist: false },
    { code: 'ZA', name: 'Sudáfrica', region: 'Africa', subregion: 'Southern Africa', capital: 'Pretoria', population: 59300000, government_type: 'República parlamentaria', watchlist: false },
    { code: 'NG', name: 'Nigeria', region: 'Africa', subregion: 'Western Africa', capital: 'Abuja', population: 206000000, government_type: 'República presidencial', watchlist: false },
    { code: 'PK', name: 'Pakistán', region: 'Asia', subregion: 'South Asia', capital: 'Islamabad', population: 220900000, government_type: 'República parlamentaria', watchlist: false },
    { code: 'KP', name: 'Corea del Norte', region: 'Asia', subregion: 'East Asia', capital: 'Pyongyang', population: 25800000, government_type: 'República socialista', watchlist: true },
    { code: 'VE', name: 'Venezuela', region: 'Americas', subregion: 'South America', capital: 'Caracas', population: 28400000, government_type: 'República presidencial', watchlist: false },
    { code: 'AF', name: 'Afganistán', region: 'Asia', subregion: 'South Asia', capital: 'Kabul', population: 38900000, government_type: 'Emirato islámico', watchlist: false },
    { code: 'SY', name: 'Siria', region: 'Asia', subregion: 'Western Asia', capital: 'Damascus', population: 17500000, government_type: 'República semi-presidencial', watchlist: true },
    { code: 'YE', name: 'Yemen', region: 'Asia', subregion: 'Western Asia', capital: 'Sanaa', population: 29800000, government_type: 'Gobierno provisional', watchlist: false },
    { code: 'ES', name: 'España', region: 'Europe', subregion: 'Southern Europe', capital: 'Madrid', population: 47000000, government_type: 'Monarquía parlamentaria', watchlist: false },
    { code: 'IT', name: 'Italia', region: 'Europe', subregion: 'Southern Europe', capital: 'Rome', population: 60000000, government_type: 'República parlamentaria', watchlist: false },
  ]

  console.log('📍 Inserting countries...')
  const { data: countriesData, error: countriesError } = await supabase
    .from('countries')
    .upsert(countries, { onConflict: 'code' })
    .select()

  if (countriesError) {
    console.error('❌ Error inserting countries:', countriesError)
  } else {
    console.log(`✅ Inserted ${countriesData?.length || 0} countries`)
  }

  // Seed some sample clusters
  const clusters = [
    {
      canonical_title: 'Tensión en el Estrecho de Taiwán',
      summary: 'Ejercicios militares chinos cerca de Taiwán aumentan las tensiones regionales',
      window_start: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      window_end: new Date().toISOString(),
      countries: ['CN', 'TW', 'US'],
      topics: ['military', 'diplomacy'],
      entities: {},
      severity: 75,
      confidence: 85,
      article_count: 15,
      source_count: 8,
    },
    {
      canonical_title: 'Conflicto Rusia-Ucrania continúa',
      summary: 'Operaciones militares en curso en la región este de Ucrania',
      window_start: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      window_end: new Date().toISOString(),
      countries: ['RU', 'UA'],
      topics: ['conflict', 'military'],
      entities: {},
      severity: 85,
      confidence: 95,
      article_count: 45,
      source_count: 12,
    },
    {
      canonical_title: 'Tensiones en Medio Oriente',
      summary: 'Disputas territoriales y diplomáticas en la región',
      window_start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      window_end: new Date().toISOString(),
      countries: ['IL', 'IR', 'SA'],
      topics: ['diplomacy', 'security'],
      entities: {},
      severity: 65,
      confidence: 75,
      article_count: 25,
      source_count: 10,
    },
    {
      canonical_title: 'Reunión G7 en Europa',
      summary: 'Líderes del G7 discuten cooperación económica y seguridad',
      window_start: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      window_end: new Date().toISOString(),
      countries: ['US', 'GB', 'DE', 'FR', 'IT', 'CA', 'JP'],
      topics: ['diplomacy', 'economy'],
      entities: {},
      severity: 30,
      confidence: 90,
      article_count: 35,
      source_count: 15,
    },
  ]

  console.log('🔴 Inserting clusters...')
  const { data: clustersData, error: clustersError } = await supabase
    .from('clusters')
    .insert(clusters)
    .select()

  if (clustersError) {
    console.error('❌ Error inserting clusters:', clustersError)
  } else {
    console.log(`✅ Inserted ${clustersData?.length || 0} clusters`)
  }

  console.log('✨ Seeding complete!')
}

seedMap()
  .then(() => {
    console.log('🎉 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error:', error)
    process.exit(1)
  })

