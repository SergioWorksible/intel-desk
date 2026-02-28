export type PerplexityChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function perplexityChat({
  model = 'sonar-pro',
  messages,
  temperature = 0.7,
  max_tokens = 2000,
}: {
  model?: string
  messages: PerplexityChatMessage[]
  temperature?: number
  max_tokens?: number
}): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured')
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Perplexity API error (${res.status}): ${text || res.statusText}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Empty response from Perplexity')
  }

  return content
}

/**
 * Extrae JSON de un texto que puede contener bloques de código markdown o texto adicional
 */
function extractJSON<T>(text: string): T | null {
  // Primero intentar parsear directamente
  try {
    return JSON.parse(text.trim()) as T
  } catch {
    // Continuar con otros métodos
  }

  // Intentar extraer de bloques de código markdown (```json ... ``` o ``` ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g
  const matches = Array.from(text.matchAll(codeBlockRegex))
  
  for (const match of matches) {
    const codeContent = match[1]?.trim()
    if (codeContent) {
      try {
        return JSON.parse(codeContent) as T
      } catch {
        // Continuar con el siguiente bloque
      }
    }
  }

  // Intentar encontrar JSON entre llaves en el texto
  const jsonObjectRegex = /\{[\s\S]*\}/
  const jsonMatch = text.match(jsonObjectRegex)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T
    } catch {
      // Continuar
    }
  }

  // Intentar encontrar JSON entre corchetes (arrays)
  const jsonArrayRegex = /\[[\s\S]*\]/
  const arrayMatch = text.match(jsonArrayRegex)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T
    } catch {
      // Continuar
    }
  }

  return null
}

export async function perplexityChatJSON<T>({
  model = 'sonar-pro',
  messages,
  temperature = 0.2,
  max_tokens = 1200,
}: {
  model?: string
  messages: PerplexityChatMessage[]
  temperature?: number
  max_tokens?: number
}): Promise<{ parsed: T | null; raw: string }> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured')
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Perplexity API error (${res.status}): ${text || res.statusText}`)
  }

  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty response from Perplexity')
  }

  // Intentar extraer y parsear JSON usando la función mejorada
  const parsed = extractJSON<T>(raw)
  return { parsed, raw }
}


