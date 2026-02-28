/**
 * Finnhub API integration for market data
 * https://finnhub.io/docs/api
 * 
 * Rate limit: 60 requests per minute (free tier)
 */

import { finnhubRateLimiter } from './rate-limiter'

const FINNHUB_API_URL = 'https://finnhub.io/api/v1'

interface FinnhubQuote {
  c: number // Current price
  d: number // Change
  dp: number // Percent change
  h: number // High price of the day
  l: number // Low price of the day
  o: number // Open price of the day
  pc: number // Previous close price
  t: number // Timestamp
}

interface FinnhubCandle {
  c: number[] // Close prices
  h: number[] // High prices
  l: number[] // Low prices
  o: number[] // Open prices
  s: string // Status
  t: number[] // Timestamps
  v: number[] // Volume
}

/**
 * Get real-time quote for a symbol
 * Uses rate limiter to respect 60 requests/minute limit
 */
export async function getQuote(symbol: string): Promise<FinnhubQuote | null> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) {
    console.warn('FINNHUB_API_KEY not configured')
    return null
  }

  return finnhubRateLimiter.execute(async () => {
    try {
      const response = await fetch(
        `${FINNHUB_API_URL}/quote?symbol=${symbol}&token=${apiKey}`,
        { next: { revalidate: 60 } } // Cache for 60 seconds
      )

      // Handle rate limit (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000
        console.warn(`Rate limit hit for ${symbol}. Waiting ${waitTime}ms...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        // Retry once
        const retryResponse = await fetch(
          `${FINNHUB_API_URL}/quote?symbol=${symbol}&token=${apiKey}`,
          { next: { revalidate: 60 } }
        )
        if (!retryResponse.ok) {
          throw new Error(`Finnhub API error: ${retryResponse.statusText}`)
        }
        const retryData = await retryResponse.json()
        if (retryData.error) {
          console.error(`Finnhub error for ${symbol}:`, retryData.error)
          return null
        }
        return retryData as FinnhubQuote
      }

      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Check for error response
      if (data.error) {
        console.error(`Finnhub error for ${symbol}:`, data.error)
        return null
      }

      return data as FinnhubQuote
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error)
      return null
    }
  })
}

/**
 * Get historical OHLCV data (candles)
 * Uses rate limiter to respect 60 requests/minute limit
 * @param symbol Stock symbol
 * @param resolution 1, 5, 15, 30, 60, D, W, M
 * @param from Unix timestamp (seconds)
 * @param to Unix timestamp (seconds)
 */
export async function getCandles(
  symbol: string,
  resolution: string = 'D',
  from: number,
  to: number
): Promise<FinnhubCandle | null> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) {
    console.warn('FINNHUB_API_KEY not configured')
    return null
  }

  return finnhubRateLimiter.execute(async () => {
    try {
      const response = await fetch(
        `${FINNHUB_API_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`,
        { next: { revalidate: 300 } } // Cache for 5 minutes
      )

      // Handle rate limit (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000
        console.warn(`Rate limit hit for ${symbol} candles. Waiting ${waitTime}ms...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        // Retry once
        const retryResponse = await fetch(
          `${FINNHUB_API_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`,
          { next: { revalidate: 300 } }
        )
        if (!retryResponse.ok) {
          throw new Error(`Finnhub API error: ${retryResponse.statusText}`)
        }
        const retryData = await retryResponse.json()
        if (retryData.s !== 'ok') {
          console.error(`Finnhub error for ${symbol}:`, retryData.s)
          return null
        }
        return retryData as FinnhubCandle
      }

      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.s !== 'ok') {
        console.error(`Finnhub error for ${symbol}:`, data.s)
        return null
      }

      return data as FinnhubCandle
    } catch (error) {
      console.error(`Failed to fetch candles for ${symbol}:`, error)
      return null
    }
  })
}

/**
 * Search for symbols
 */
export async function searchSymbols(query: string): Promise<any[]> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) {
    return []
  }

  try {
    const response = await fetch(
      `${FINNHUB_API_URL}/search?q=${encodeURIComponent(query)}&token=${apiKey}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.result || []
  } catch (error) {
    console.error('Failed to search symbols:', error)
    return []
  }
}

/**
 * Get company profile
 * Uses rate limiter to respect 60 requests/minute limit
 */
export async function getCompanyProfile(symbol: string): Promise<any | null> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) {
    return null
  }

  return finnhubRateLimiter.execute(async () => {
    try {
      const response = await fetch(
        `${FINNHUB_API_URL}/stock/profile2?symbol=${symbol}&token=${apiKey}`,
        { next: { revalidate: 3600 } } // Cache for 1 hour
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Failed to fetch company profile for ${symbol}:`, error)
      return null
    }
  })
}

/**
 * Get company news
 * Uses rate limiter to respect 60 requests/minute limit
 */
export async function getCompanyNews(
  symbol: string,
  from: string,
  to: string
): Promise<any[]> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) {
    return []
  }

  return finnhubRateLimiter.execute(async () => {
    try {
      const response = await fetch(
        `${FINNHUB_API_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${apiKey}`,
        { next: { revalidate: 300 } } // Cache for 5 minutes
      )

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error(`Failed to fetch news for ${symbol}:`, error)
      return []
    }
  })
}

/**
 * Get analyst recommendations
 */
export async function getRecommendations(symbol: string): Promise<any | null> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) {
    return null
  }

  try {
    const response = await fetch(
      `${FINNHUB_API_URL}/stock/recommendation?symbol=${symbol}&token=${apiKey}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to fetch recommendations for ${symbol}:`, error)
    return null
  }
}

/**
 * Get market news
 */
export async function getMarketNews(category: string = 'general'): Promise<any[]> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) {
    return []
  }

  try {
    const response = await fetch(
      `${FINNHUB_API_URL}/news?category=${category}&token=${apiKey}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return Array.isArray(data) ? data.slice(0, 50) : []
  } catch (error) {
    console.error('Failed to fetch market news:', error)
    return []
  }
}

/**
 * Get financial metrics
 */
export async function getFinancialMetrics(symbol: string, metric: string = 'all'): Promise<any | null> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) {
    return null
  }

  try {
    const response = await fetch(
      `${FINNHUB_API_URL}/stock/metric?symbol=${symbol}&metric=${metric}&token=${apiKey}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to fetch financial metrics for ${symbol}:`, error)
    return null
  }
}

