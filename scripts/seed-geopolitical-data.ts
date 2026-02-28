import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

async function seedGeopoliticalData() {
  console.log('🌍 Seeding geopolitical data...\n')

  // Countries with watchlist status and indices
  const countriesData = [
    // Major powers
    { code: 'US', name: 'Estados Unidos', region: 'North America', capital: 'Washington D.C.', population: 331000000, government_type: 'Federal Republic', leader_name: 'Joe Biden', leader_title: 'President', watchlist: false, stability_index: 75, economic_index: 80, political_index: 70 },
    { code: 'CN', name: 'China', region: 'East Asia', capital: 'Beijing', population: 1400000000, government_type: 'Communist Party-led', leader_name: 'Xi Jinping', leader_title: 'President', watchlist: true, stability_index: 60, economic_index: 70, political_index: 40 },
    { code: 'RU', name: 'Rusia', region: 'Eastern Europe', capital: 'Moscow', population: 144000000, government_type: 'Federal Republic', leader_name: 'Vladimir Putin', leader_title: 'President', watchlist: true, stability_index: 30, economic_index: 35, political_index: 25 },
    { code: 'GB', name: 'Reino Unido', region: 'Western Europe', capital: 'London', population: 67000000, government_type: 'Constitutional Monarchy', leader_name: 'Rishi Sunak', leader_title: 'Prime Minister', watchlist: false, stability_index: 80, economic_index: 75, political_index: 75 },
    { code: 'DE', name: 'Alemania', region: 'Western Europe', capital: 'Berlin', population: 83000000, government_type: 'Federal Republic', leader_name: 'Olaf Scholz', leader_title: 'Chancellor', watchlist: false, stability_index: 85, economic_index: 80, political_index: 80 },
    { code: 'FR', name: 'Francia', region: 'Western Europe', capital: 'Paris', population: 67000000, government_type: 'Semi-Presidential Republic', leader_name: 'Emmanuel Macron', leader_title: 'President', watchlist: false, stability_index: 75, economic_index: 70, political_index: 70 },
    
    // Conflict zones
    { code: 'UA', name: 'Ucrania', region: 'Eastern Europe', capital: 'Kyiv', population: 41000000, government_type: 'Unitary Republic', leader_name: 'Volodymyr Zelenskyy', leader_title: 'President', watchlist: true, stability_index: 15, economic_index: 25, political_index: 40 },
    { code: 'IL', name: 'Israel', region: 'Middle East', capital: 'Jerusalem', population: 9000000, government_type: 'Parliamentary Democracy', leader_name: 'Benjamin Netanyahu', leader_title: 'Prime Minister', watchlist: true, stability_index: 25, economic_index: 70, political_index: 45 },
    { code: 'IR', name: 'Irán', region: 'Middle East', capital: 'Tehran', population: 85000000, government_type: 'Islamic Republic', leader_name: 'Ali Khamenei', leader_title: 'Supreme Leader', watchlist: true, stability_index: 35, economic_index: 30, political_index: 20 },
    { code: 'SY', name: 'Siria', region: 'Middle East', capital: 'Damascus', population: 18000000, government_type: 'Presidential Republic', leader_name: 'Bashar al-Assad', leader_title: 'President', watchlist: true, stability_index: 10, economic_index: 10, political_index: 15 },
    { code: 'YE', name: 'Yemen', region: 'Middle East', capital: 'Sanaa', population: 30000000, government_type: 'Transitional', leader_name: 'Rashad al-Alimi', leader_title: 'President', watchlist: true, stability_index: 5, economic_index: 5, political_index: 10 },
    { code: 'AF', name: 'Afganistán', region: 'Central Asia', capital: 'Kabul', population: 40000000, government_type: 'Islamic Emirate', leader_name: 'Hibatullah Akhundzada', leader_title: 'Supreme Leader', watchlist: true, stability_index: 10, economic_index: 5, political_index: 5 },
    
    // Strategic countries
    { code: 'TW', name: 'Taiwán', region: 'East Asia', capital: 'Taipei', population: 24000000, government_type: 'Semi-Presidential Republic', leader_name: 'Lai Ching-te', leader_title: 'President', watchlist: true, stability_index: 50, economic_index: 75, political_index: 55 },
    { code: 'KP', name: 'Corea del Norte', region: 'East Asia', capital: 'Pyongyang', population: 26000000, government_type: "Juche Single-party State", leader_name: 'Kim Jong-un', leader_title: 'Supreme Leader', watchlist: true, stability_index: 20, economic_index: 10, political_index: 5 },
    { code: 'KR', name: 'Corea del Sur', region: 'East Asia', capital: 'Seoul', population: 52000000, government_type: 'Presidential Republic', leader_name: 'Yoon Suk-yeol', leader_title: 'President', watchlist: false, stability_index: 75, economic_index: 80, political_index: 70 },
    { code: 'JP', name: 'Japón', region: 'East Asia', capital: 'Tokyo', population: 125000000, government_type: 'Constitutional Monarchy', leader_name: 'Fumio Kishida', leader_title: 'Prime Minister', watchlist: false, stability_index: 85, economic_index: 75, political_index: 80 },
    { code: 'IN', name: 'India', region: 'South Asia', capital: 'New Delhi', population: 1400000000, government_type: 'Federal Republic', leader_name: 'Narendra Modi', leader_title: 'Prime Minister', watchlist: false, stability_index: 65, economic_index: 60, political_index: 60 },
    { code: 'PK', name: 'Pakistán', region: 'South Asia', capital: 'Islamabad', population: 230000000, government_type: 'Federal Republic', leader_name: 'Shehbaz Sharif', leader_title: 'Prime Minister', watchlist: true, stability_index: 35, economic_index: 30, political_index: 35 },
    { code: 'TR', name: 'Turquía', region: 'Middle East', capital: 'Ankara', population: 85000000, government_type: 'Presidential Republic', leader_name: 'Recep Tayyip Erdogan', leader_title: 'President', watchlist: false, stability_index: 55, economic_index: 45, political_index: 50 },
    { code: 'SA', name: 'Arabia Saudita', region: 'Middle East', capital: 'Riyadh', population: 36000000, government_type: 'Absolute Monarchy', leader_name: 'Mohammed bin Salman', leader_title: 'Crown Prince', watchlist: false, stability_index: 65, economic_index: 70, political_index: 35 },
    { code: 'EG', name: 'Egipto', region: 'North Africa', capital: 'Cairo', population: 105000000, government_type: 'Presidential Republic', leader_name: 'Abdel Fattah el-Sisi', leader_title: 'President', watchlist: false, stability_index: 50, economic_index: 40, political_index: 35 },
    
    // European allies
    { code: 'PL', name: 'Polonia', region: 'Eastern Europe', capital: 'Warsaw', population: 38000000, government_type: 'Parliamentary Republic', leader_name: 'Donald Tusk', leader_title: 'Prime Minister', watchlist: false, stability_index: 75, economic_index: 70, political_index: 70 },
    { code: 'IT', name: 'Italia', region: 'Southern Europe', capital: 'Rome', population: 60000000, government_type: 'Parliamentary Republic', leader_name: 'Giorgia Meloni', leader_title: 'Prime Minister', watchlist: false, stability_index: 70, economic_index: 65, political_index: 65 },
    { code: 'ES', name: 'España', region: 'Southern Europe', capital: 'Madrid', population: 47000000, government_type: 'Parliamentary Monarchy', leader_name: 'Pedro Sánchez', leader_title: 'Prime Minister', watchlist: false, stability_index: 75, economic_index: 65, political_index: 70 },
    
    // African hotspots
    { code: 'SD', name: 'Sudán', region: 'North Africa', capital: 'Khartoum', population: 45000000, government_type: 'Transitional', leader_name: 'Abdel Fattah al-Burhan', leader_title: 'Chairman', watchlist: true, stability_index: 10, economic_index: 10, political_index: 10 },
    { code: 'ET', name: 'Etiopía', region: 'East Africa', capital: 'Addis Ababa', population: 120000000, government_type: 'Federal Republic', leader_name: 'Abiy Ahmed', leader_title: 'Prime Minister', watchlist: true, stability_index: 30, economic_index: 25, political_index: 30 },
    
    // Latin America
    { code: 'VE', name: 'Venezuela', region: 'South America', capital: 'Caracas', population: 28000000, government_type: 'Federal Republic', leader_name: 'Nicolás Maduro', leader_title: 'President', watchlist: true, stability_index: 25, economic_index: 15, political_index: 20 },
    { code: 'BR', name: 'Brasil', region: 'South America', capital: 'Brasilia', population: 215000000, government_type: 'Federal Republic', leader_name: 'Luiz Inácio Lula da Silva', leader_title: 'President', watchlist: false, stability_index: 60, economic_index: 55, political_index: 55 },
    { code: 'MX', name: 'México', region: 'North America', capital: 'Mexico City', population: 130000000, government_type: 'Federal Republic', leader_name: 'Claudia Sheinbaum', leader_title: 'President', watchlist: false, stability_index: 55, economic_index: 55, political_index: 50 },
  ]

  console.log(`📌 Upserting ${countriesData.length} countries...`)
  
  for (const country of countriesData) {
    const { error } = await supabase.from('countries').upsert(country, { onConflict: 'code' })
    if (error) console.error(`Error inserting ${country.code}:`, error.message)
  }
  console.log('✅ Countries seeded\n')

  // Geopolitical clusters (events/conflicts)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  const clustersData = [
    {
      canonical_title: 'Conflicto Rusia-Ucrania: Ofensiva de invierno',
      summary: 'Intensificación de combates en el frente oriental con ataques a infraestructura crítica.',
      countries: ['RU', 'UA'],
      severity: 85,
      article_count: 45,
      source_count: 12,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Tensiones en el Mar de China Meridional',
      summary: 'China aumenta presencia militar cerca de islas disputadas. Filipinas y Vietnam protestan.',
      countries: ['CN', 'TW', 'PH', 'VN'],
      severity: 72,
      article_count: 23,
      source_count: 8,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Crisis en Gaza: Operación militar israelí',
      summary: 'Continúan los enfrentamientos en Gaza con crisis humanitaria en desarrollo.',
      countries: ['IL', 'EG', 'JO', 'LB'],
      severity: 90,
      article_count: 67,
      source_count: 15,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Programa nuclear de Corea del Norte',
      summary: 'Nuevas pruebas de misiles balísticos generan alarma internacional.',
      countries: ['KP', 'KR', 'JP', 'US'],
      severity: 68,
      article_count: 18,
      source_count: 6,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Tensión India-Pakistán en Cachemira',
      summary: 'Intercambio de fuego en la línea de control. Ambos países refuerzan posiciones.',
      countries: ['IN', 'PK'],
      severity: 55,
      article_count: 12,
      source_count: 5,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Sanciones occidentales contra Irán',
      summary: 'UE y EEUU amplían sanciones por programa de drones y apoyo a Rusia.',
      countries: ['IR', 'US', 'GB', 'DE', 'FR'],
      severity: 60,
      article_count: 25,
      source_count: 9,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Guerra civil en Sudán',
      summary: 'Enfrentamientos entre RSF y fuerzas armadas causan desplazamiento masivo.',
      countries: ['SD', 'ET', 'EG'],
      severity: 82,
      article_count: 34,
      source_count: 11,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Crisis en el Mar Rojo: Ataques Hutíes',
      summary: 'Ataques a buques comerciales interrumpen rutas marítimas globales.',
      countries: ['YE', 'SA', 'US', 'GB', 'IR'],
      severity: 75,
      article_count: 41,
      source_count: 10,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Inestabilidad política en Venezuela',
      summary: 'Protestas masivas y crisis económica continúan afectando al país.',
      countries: ['VE', 'CO', 'BR'],
      severity: 50,
      article_count: 15,
      source_count: 5,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Expansión de la OTAN: Respuesta rusa',
      summary: 'Rusia advierte sobre consecuencias de membresía de Finlandia y Suecia.',
      countries: ['RU', 'FI', 'SE', 'US', 'DE', 'PL'],
      severity: 45,
      article_count: 28,
      source_count: 7,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Tensiones Turquía-Grecia en el Egeo',
      summary: 'Disputas sobre espacio aéreo y aguas territoriales continúan.',
      countries: ['TR', 'GR'],
      severity: 42,
      article_count: 8,
      source_count: 4,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Crisis de refugiados sirios',
      summary: 'Nuevas oleadas de desplazamiento interno por enfrentamientos.',
      countries: ['SY', 'TR', 'JO', 'LB'],
      severity: 65,
      article_count: 19,
      source_count: 6,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Competencia tecnológica EEUU-China',
      summary: 'Nuevas restricciones de exportación de semiconductores a China.',
      countries: ['US', 'CN', 'TW', 'KR', 'JP'],
      severity: 55,
      article_count: 32,
      source_count: 9,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      canonical_title: 'Situación en Afganistán bajo los talibanes',
      summary: 'Crisis humanitaria y restricciones a derechos de mujeres continúan.',
      countries: ['AF', 'PK', 'IR'],
      severity: 58,
      article_count: 14,
      source_count: 5,
      window_start: weekAgo.toISOString(),
      window_end: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ]

  console.log(`🔴 Inserting ${clustersData.length} clusters...`)
  
  const { error: clustersError } = await supabase.from('clusters').insert(clustersData)
  if (clustersError) {
    console.error('Error inserting clusters:', clustersError.message)
  } else {
    console.log('✅ Clusters seeded\n')
  }

  // First create a sample source for articles
  const { data: existingSource } = await supabase
    .from('sources')
    .select('id')
    .eq('name', 'Geopolitical News Wire')
    .single()

  let sourceId = existingSource?.id

  if (!sourceId) {
    const { data: newSource, error: sourceError } = await supabase
      .from('sources')
      .insert({
        name: 'Geopolitical News Wire',
        type: 'wire',
        website_url: 'https://example.com',
        language: 'en',
        reputation_base: 70,
        enabled: true,
        tags: ['geopolitics', 'international'],
      })
      .select('id')
      .single()

    if (sourceError) {
      console.error('Error creating source:', sourceError.message)
    } else {
      sourceId = newSource.id
      console.log('✅ Source created\n')
    }
  }

  let articlesData: Array<{ source_id: string; title: string; url: string; canonical_url: string; domain: string; countries: string[]; published_at: string }> = []
  
  if (sourceId) {
    // Sample articles
    articlesData = [
      { source_id: sourceId, title: 'Ucrania repele ataque ruso en Donetsk', url: 'https://example.com/1', canonical_url: 'https://example.com/1', domain: 'example.com', countries: ['UA', 'RU'], published_at: now.toISOString() },
      { source_id: sourceId, title: 'China realiza ejercicios militares cerca de Taiwán', url: 'https://example.com/2', canonical_url: 'https://example.com/2', domain: 'example.com', countries: ['CN', 'TW'], published_at: now.toISOString() },
      { source_id: sourceId, title: 'Israel intensifica operaciones en Gaza', url: 'https://example.com/3', canonical_url: 'https://example.com/3', domain: 'example.com', countries: ['IL', 'EG'], published_at: now.toISOString() },
      { source_id: sourceId, title: 'Corea del Norte lanza misil balístico', url: 'https://example.com/4', canonical_url: 'https://example.com/4', domain: 'example.com', countries: ['KP', 'KR', 'JP'], published_at: now.toISOString() },
      { source_id: sourceId, title: 'Irán aumenta enriquecimiento de uranio', url: 'https://example.com/5', canonical_url: 'https://example.com/5', domain: 'example.com', countries: ['IR', 'US'], published_at: now.toISOString() },
      { source_id: sourceId, title: 'Hutíes atacan otro buque en Mar Rojo', url: 'https://example.com/6', canonical_url: 'https://example.com/6', domain: 'example.com', countries: ['YE', 'SA'], published_at: now.toISOString() },
      { source_id: sourceId, title: 'Sudán: miles huyen de Jartum', url: 'https://example.com/7', canonical_url: 'https://example.com/7', domain: 'example.com', countries: ['SD'], published_at: now.toISOString() },
      { source_id: sourceId, title: 'EEUU envía más tropas a Europa del Este', url: 'https://example.com/8', canonical_url: 'https://example.com/8', domain: 'example.com', countries: ['US', 'PL', 'DE'], published_at: now.toISOString() },
      { source_id: sourceId, title: 'Zelensky pide más ayuda militar occidental', url: 'https://example.com/9', canonical_url: 'https://example.com/9', domain: 'example.com', countries: ['UA', 'US', 'GB'], published_at: now.toISOString() },
      { source_id: sourceId, title: 'Putin advierte sobre armas nucleares', url: 'https://example.com/10', canonical_url: 'https://example.com/10', domain: 'example.com', countries: ['RU'], published_at: now.toISOString() },
    ]

    console.log(`📰 Inserting ${articlesData.length} articles...`)
    
    // Use upsert to avoid duplicates
    for (const article of articlesData) {
      const { error: articleError } = await supabase.from('articles').upsert(article, { onConflict: 'canonical_url' })
      if (articleError && !articleError.message.includes('duplicate')) {
        console.error(`Error inserting article:`, articleError.message)
      }
    }
    console.log('✅ Articles seeded\n')
  }

  console.log('🎉 Geopolitical data seeding complete!')
  console.log('\nSummary:')
  console.log(`- ${countriesData.length} countries`)
  console.log(`- ${clustersData.length} clusters/events`)
  console.log(`- ${articlesData?.length || 0} articles`)
}

seedGeopoliticalData().catch(console.error)

