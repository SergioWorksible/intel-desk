/**
 * Cliente para el microservicio de clustering ML en Python
 */

interface ClusterResult {
  created: number
  updated: number
  duplicates: number
  outliers: number
  processed: number
  message: string
}

interface SimilarityResult {
  similarity: number
  is_similar: boolean
}

interface FindClusterResult {
  cluster_id: string | null
  similarity: number
  alternatives?: Array<{ cluster_id: string; similarity: number }>
}

interface DuplicateResult {
  duplicates: Array<{
    id1: string
    id2: string
    similarity: number
  }>
  count: number
}

interface EmbeddingResult {
  embeddings: number[][]
  dimension: number
  count: number
}

// URL del servicio Python (local por defecto)
const ML_CLUSTER_URL = process.env.ML_CLUSTER_URL || 'http://localhost:5001'

/**
 * Cliente para el servicio de clustering ML
 */
class MLClusterClient {
  private baseUrl: string
  private timeout: number

  constructor(baseUrl: string = ML_CLUSTER_URL, timeout: number = 120000) {
    this.baseUrl = baseUrl
    this.timeout = timeout
  }

  /**
   * Verifica que el servicio esté disponible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      const isOk = response.ok
      if (!isOk) {
        console.warn(`ML Cluster service health check failed: ${response.status} ${response.statusText}`)
      }
      return isOk
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`ML Cluster service not available at ${this.baseUrl}:`, errorMessage)
      console.error('💡 Asegúrate de que el servicio Python esté corriendo:')
      console.error(`   cd ml-cluster && python run.py`)
      console.error(`   O verifica que ML_CLUSTER_URL esté configurado correctamente`)
      return false
    }
  }

  /**
   * Ejecuta clustering completo de artículos sin cluster
   */
  async clusterArticles(options?: {
    days?: number
    limit?: number
  }): Promise<ClusterResult> {
    const response = await fetch(`${this.baseUrl}/api/cluster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Clustering failed')
    }

    return response.json()
  }

  /**
   * Genera embeddings para textos
   */
  async embed(texts: string[]): Promise<EmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Embedding failed')
    }

    return response.json()
  }

  /**
   * Calcula similitud entre dos textos
   */
  async calculateSimilarity(text1: string, text2: string): Promise<SimilarityResult> {
    const response = await fetch(`${this.baseUrl}/api/similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text1, text2 }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Similarity calculation failed')
    }

    return response.json()
  }

  /**
   * Encuentra el mejor cluster para un artículo
   */
  async findClusterForArticle(article: {
    title: string
    snippet?: string
    countries?: string[]
    topics?: string[]
  }): Promise<FindClusterResult> {
    const response = await fetch(`${this.baseUrl}/api/find-cluster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(article),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Find cluster failed')
    }

    return response.json()
  }

  /**
   * Detecta artículos duplicados
   */
  async findDuplicates(options?: {
    days?: number
    limit?: number
  }): Promise<DuplicateResult> {
    const response = await fetch(`${this.baseUrl}/api/deduplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Deduplication failed')
    }

    return response.json()
  }
}

// Instancia singleton
let mlClusterClient: MLClusterClient | null = null

/**
 * Obtiene el cliente de ML Cluster
 */
export function getMLClusterClient(): MLClusterClient {
  if (!mlClusterClient) {
    mlClusterClient = new MLClusterClient()
  }
  return mlClusterClient
}

/**
 * Función helper para ejecutar clustering con fallback
 */
export async function runMLClustering(options?: {
  days?: number
  limit?: number
}): Promise<ClusterResult | null> {
  const client = getMLClusterClient()
  const url = process.env.ML_CLUSTER_URL || 'http://localhost:5001'

  console.log(`🔍 Verificando servicio ML Cluster en ${url}...`)

  // Verificar disponibilidad del servicio
  const isAvailable = await client.healthCheck()
  if (!isAvailable) {
    console.warn('⚠️  ML Cluster service not available, skipping ML clustering')
    console.warn('   El sistema usará clustering básico (smart clustering) como fallback')
    return null
  }

  try {
    console.log(`✅ Servicio ML Cluster disponible, ejecutando clustering...`)
    console.log(`   Opciones: ${JSON.stringify(options || {})}`)
    
    const result = await client.clusterArticles(options)
    
    console.log(`✅ ML Clustering completado:`)
    console.log(`   - Procesados: ${result.processed || 0}`)
    console.log(`   - Clusters creados: ${result.created || 0}`)
    console.log(`   - Clusters actualizados: ${result.updated || 0}`)
    console.log(`   - Duplicados encontrados: ${result.duplicates || 0}`)
    console.log(`   - Outliers: ${result.outliers || 0}`)
    
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Error en ML Clustering:', errorMessage)
    console.error('   Stack:', error instanceof Error ? error.stack : 'N/A')
    return null
  }
}

export { MLClusterClient }
export type { ClusterResult, SimilarityResult, FindClusterResult, DuplicateResult }
