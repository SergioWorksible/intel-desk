import { perplexityChat, type PerplexityChatMessage } from './perplexity'
import { getAtlasContext, formatAtlasContext } from './atlas-context'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface AtlasMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const ATLAS_SYSTEM_PROMPT = `Eres Atlas, un asistente de inteligencia geopolítica especializado para Intel Desk. Tu nombre es Atlas, como el titán que sostiene el mundo, y eres un analista experto en geopolítica, relaciones internacionales, conflictos, economía global y dinámicas de poder.

TU PERSONALIDAD:
- Eres profesional pero accesible, con un tono conversacional
- Tienes conocimiento profundo de geopolítica, historia y relaciones internacionales
- Eres preciso y basas tus respuestas en evidencia cuando es posible
- Reconoces cuando no tienes suficiente información
- Eres proactivo en sugerir temas relacionados o señales a monitorear

TU CONTEXTO:
Tienes acceso al contexto de Intel Desk que incluye:
- Briefings diarios con eventos clave
- Clusters de eventos geopolíticos recientes
- Artículos de noticias de múltiples fuentes
- Países en monitoreo especial
- Análisis de severidad y confianza

REGLAS CRÍTICAS:
1. SIEMPRE menciona cuando usas información del contexto de Intel Desk
2. Si el contexto no tiene información relevante, usa tu conocimiento general pero indica que no hay datos específicos en Intel Desk
3. Combina el contexto de Intel Desk con información actualizada de Perplexity cuando sea relevante
4. Sé específico: menciona países, fechas, eventos concretos cuando los conozcas
5. Si hay incertidumbres o información contradictoria, menciónalo
6. Sugiere señales a monitorear o preguntas de seguimiento cuando sea apropiado
7. Mantén un tono profesional pero conversacional, como un colega analista

FORMATO DE RESPUESTAS:
- Responde de forma natural y conversacional
- Usa párrafos claros y estructurados
- Menciona fuentes cuando uses información específica de Intel Desk
- Incluye contexto histórico o comparaciones cuando sea relevante
- Termina con sugerencias de seguimiento cuando sea apropiado

Recuerda: Eres Atlas, el asistente de inteligencia geopolítica de Intel Desk. Ayudas a los usuarios a entender eventos globales, identificar patrones y tomar decisiones informadas.`

/**
 * Genera una respuesta del chatbot Atlas usando Perplexity con contexto de Intel Desk
 */
export async function chatWithAtlas(
  supabase: SupabaseClient<Database>,
  messages: AtlasMessage[],
  userQuery: string
): Promise<string> {
  try {
    // Obtener contexto relevante de Intel Desk
    const context = await getAtlasContext(supabase, userQuery)
    const contextText = formatAtlasContext(context)

    // Construir mensajes para Perplexity asegurando alternancia correcta
    const perplexityMessages: PerplexityChatMessage[] = [
      {
        role: 'system',
        content: `${ATLAS_SYSTEM_PROMPT}\n\n${contextText}\n\nINSTRUCCIONES ESPECÍFICAS:\n- Si la pregunta del usuario está relacionada con eventos, países o temas mencionados en el contexto de Intel Desk, PRIORIZA esa información y menciónala explícitamente.\n- Cuando uses información del contexto de Intel Desk, indica que proviene de "Intel Desk" o "nuestros datos".\n- Si el contexto no tiene información relevante, usa tu conocimiento general de Perplexity pero indica que "no hay datos específicos en Intel Desk sobre este tema en este momento".\n- Combina ambos: contexto de Intel Desk para datos internos + conocimiento de Perplexity para información actualizada y contexto histórico.\n- Sé específico: menciona países, fechas, eventos concretos cuando los conozcas del contexto o de tu conocimiento.`,
      },
    ]

    // Procesar historial asegurando alternancia correcta
    // Combinar mensajes consecutivos del mismo rol
    const normalizedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    
    for (const msg of messages) {
      const currentRole = msg.role as 'user' | 'assistant'
      const lastMsg = normalizedHistory[normalizedHistory.length - 1]
      
      if (lastMsg && lastMsg.role === currentRole) {
        // Combinar con el mensaje anterior del mismo rol
        lastMsg.content += '\n\n' + msg.content
      } else {
        // Agregar nuevo mensaje
        normalizedHistory.push({
          role: currentRole,
          content: msg.content,
        })
      }
    }

    // CRÍTICO: Después del sistema, el primer mensaje DEBE ser de usuario
    // Encontrar el primer mensaje de usuario en el historial
    let firstUserIndex = -1
    for (let i = 0; i < normalizedHistory.length; i++) {
      if (normalizedHistory[i].role === 'user') {
        firstUserIndex = i
        break
      }
    }

    // Si encontramos un usuario, empezar desde ahí (descartar asistentes previos)
    // Si no hay usuarios en el historial, empezar vacío (solo agregaremos el nuevo query)
    const conversationStart = firstUserIndex >= 0 ? firstUserIndex : normalizedHistory.length
    const conversationMessages = normalizedHistory.slice(conversationStart)

    // Tomar últimos 6 mensajes para mantener contexto (máximo 3 turnos: user-assistant-user-assistant-user-assistant)
    const recentHistory = conversationMessages.slice(-6)
    
    // Agregar historial asegurando alternancia
    for (const msg of recentHistory) {
      perplexityMessages.push({
        role: msg.role,
        content: msg.content,
      })
    }

    // Agregar el nuevo query del usuario
    const lastMessage = perplexityMessages[perplexityMessages.length - 1]
    
    if (lastMessage && lastMessage.role === 'user') {
      // Si el último es usuario, combinar con el nuevo query
      lastMessage.content += '\n\n' + userQuery
    } else {
      // Si el último es asistente o no hay mensajes, agregar como nuevo usuario
      perplexityMessages.push({
        role: 'user',
        content: userQuery,
      })
    }

    // Validación final de alternancia
    // Verificar que después del sistema siempre empiece con usuario
    if (perplexityMessages.length > 1 && perplexityMessages[1].role !== 'user') {
      console.error('Error: First message after system must be user. Messages:', perplexityMessages.map(m => m.role))
      throw new Error('Invalid message sequence: must start with user after system')
    }
    
    // Verificar alternancia en el resto de mensajes
    for (let i = 2; i < perplexityMessages.length; i++) {
      const prev = perplexityMessages[i - 1].role
      const curr = perplexityMessages[i].role
      if (prev === curr) {
        console.error(`Error: Consecutive ${prev} messages at index ${i}`)
        throw new Error(`Invalid message sequence: consecutive ${prev} messages`)
      }
    }

    // Llamar a Perplexity
    const response = await perplexityChat({
      model: 'sonar-pro',
      messages: perplexityMessages,
      temperature: 0.7, // Un poco más creativo para conversación
      max_tokens: 2000, // Respuestas más largas
    })

    return response
  } catch (error) {
    console.error('Error en chat con Atlas:', error)
    throw error
  }
}

