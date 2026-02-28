import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatWithAtlas, type AtlasMessage } from '@/lib/ai/atlas'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { message, conversationHistory } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'El mensaje es requerido' },
        { status: 400 }
      )
    }

    // Convertir historial de conversación al formato esperado
    const messages: AtlasMessage[] = (conversationHistory || []).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
    }))

    // Generar respuesta con Atlas
    const response = await chatWithAtlas(supabase, messages, message)

    // Guardar la conversación en la base de datos (opcional, para historial)
    // Por ahora solo retornamos la respuesta

    return NextResponse.json({
      message: response,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error en chat Atlas:', error)
    
    // Si es un error de API key faltante, dar un mensaje más claro
    if (error instanceof Error && error.message.includes('PERPLEXITY_API_KEY')) {
      return NextResponse.json(
        {
          error: 'Perplexity API no configurada. Por favor, configura PERPLEXITY_API_KEY en las variables de entorno.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

