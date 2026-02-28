import OpenAI from 'openai'
import { perplexityChatJSON, perplexityChat } from './perplexity'

// AI Service Contract Types
export interface AIResponse {
  answer: string
  key_facts: { text: string; citations: string[] }[]
  analysis: { text: string; citations?: string[] }[]
  uncertainties: string[]
  next_signals: string[]
  confidence: { score: number; rationale: string }
}

export interface BriefingItem {
  title: string
  fact: string
  citations: { source: string; url: string }[]
  why_it_matters: string
  signals_72h: string[]
  confidence: number
  topics: string[]
  countries: string[]
}

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// System prompts
const RESEARCH_SYSTEM_PROMPT = `You are an intelligence analyst for Intel Desk, a geopolitical intelligence system.
Your responses MUST follow this exact JSON structure:
{
  "answer": "Your main answer here",
  "key_facts": [{"text": "Fact text", "citations": ["source1", "source2"]}],
  "analysis": [{"text": "Analysis text", "citations": ["optional"]}],
  "uncertainties": ["Uncertainty 1", "Uncertainty 2"],
  "next_signals": ["Signal to watch 1", "Signal to watch 2"],
  "confidence": {"score": 75, "rationale": "Explanation for confidence score"}
}

CRITICAL RULES:
1. FACTS require citations from the provided context. Never invent facts.
2. ANALYSIS may include inferences but must be labeled as such.
3. If evidence is insufficient, explicitly state this.
4. Confidence score must reflect actual evidence strength.
5. NO hallucinated information. Only use provided context.
6. Be concise but thorough.`

const BRIEFING_SYSTEM_PROMPT = `You are an intelligence analyst generating a daily briefing for Intel Desk.
Based on the provided event clusters, generate 5-7 briefing items.

CRITICAL: Output ONLY valid JSON. Do NOT wrap it in markdown code blocks (no \`\`\`json or \`\`\`). Do NOT add any text before or after the JSON. Output the raw JSON array directly.

Each item MUST follow this JSON structure in an array:
[{
  "title": "Brief title",
  "fact": "The verified fact with what happened",
  "citations": [{"source": "Source name", "url": "url"}],
  "why_it_matters": "Mechanism and implications",
  "signals_72h": ["Signal 1 to watch", "Signal 2"],
  "confidence": 85,
  "topics": ["energy", "defense"],
  "countries": ["US", "RU"]
}]

RULES:
1. Each item must have a verifiable fact from the provided context.
2. Why it matters should explain the mechanism, not just restate the fact.
3. 72h signals should be specific and observable.
4. Confidence reflects evidence quality (0-100).
5. Prioritize by severity and global impact.
6. Maximum 7 items. Focus on the most significant events.
7. Use Perplexity to enrich the briefing with current information and context when relevant.`

const RED_TEAM_PROMPT = `You are a red team analyst. Your job is to find the strongest counter-arguments to a hypothesis.
Be rigorous and thorough. Identify:
1. Logical flaws in the hypothesis
2. Alternative explanations for the evidence
3. Historical cases where similar hypotheses failed
4. Specific evidence that would disprove this hypothesis
5. Assumptions that may be incorrect

Output a structured analysis with these sections.`

const PREMORTEM_PROMPT = `You are conducting a pre-mortem analysis. Assume the hypothesis/prediction has completely failed in 6 months.
Identify:
1. What went wrong (most likely failure modes)
2. Early warning signs that were missed
3. Key assumptions that proved false
4. External factors that changed
5. How to detect these failures early

Be specific and actionable. Output as structured analysis.`

/**
 * Generate research answer with grounded response
 */
export async function generateResearchAnswer(
  query: string,
  context: { title: string; content: string; source: string; url: string }[]
): Promise<AIResponse> {
  try {
    const contextText = context
      .map((c, i) => `[${i + 1}] ${c.source}: ${c.title}\n${c.content}`)
      .join('\n\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: RESEARCH_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `CONTEXT:\n${contextText}\n\nQUESTION: ${query}\n\nProvide a grounded response using ONLY the context above. Respond in JSON format.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from AI')
    }

    const parsed = JSON.parse(content) as AIResponse

    // Validate response structure
    if (!parsed.answer || !parsed.confidence?.score) {
      throw new Error('Invalid response structure')
    }

    return parsed
  } catch (error) {
    console.error('AI Research Error:', error)
    
    // Return fallback response
    return {
      answer: 'Unable to generate a grounded response. Insufficient evidence in the provided context.',
      key_facts: [],
      analysis: [],
      uncertainties: ['AI service unavailable or context insufficient'],
      next_signals: [],
      confidence: { score: 0, rationale: 'Could not process request' },
    }
  }
}

/**
 * Generate advanced research with Perplexity integration and conversation history
 */
export async function generateAdvancedResearch(
  query: string,
  context: { title: string; content: string; source: string; url: string }[],
  perplexityContext: string = '',
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<AIResponse> {
  try {
    const contextText = context
      .map((c, i) => `[${i + 1}] ${c.source}: ${c.title}\n${c.content}${c.url ? `\nURL: ${c.url}` : ''}`)
      .join('\n\n')

    const enhancedPrompt = `You are a senior intelligence analyst at a classified intelligence agency. Your analysis must be rigorous, evidence-based, and actionable.

CONTEXT FROM INTELLIGENCE DATABASE:
${contextText}

${perplexityContext ? `\n\nREAL-TIME RESEARCH (Perplexity):\n${perplexityContext}\n` : ''}

${conversationHistory.length > 0 ? `\n\nCONVERSATION HISTORY:\n${conversationHistory.map((m, i) => `${m.role === 'user' ? 'USER' : 'ANALYST'}: ${m.content}`).join('\n\n')}\n` : ''}

QUESTION: ${query}

Provide a comprehensive intelligence analysis following the JSON structure. Use both the database context and real-time research. If there are contradictions, note them in uncertainties.`

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `You are a senior intelligence analyst with expertise in geopolitical analysis, strategic intelligence, and evidence-based reasoning. Your responses must be:

1. RIGOROUS: Every fact must be traceable to sources
2. ANALYTICAL: Go beyond facts to explain mechanisms and implications
3. ACTIONABLE: Provide clear signals and next steps
4. HONEST: Explicitly state uncertainties and limitations
5. PROFESSIONAL: Use intelligence community standards and terminology

${RESEARCH_SYSTEM_PROMPT}`,
      },
      { role: 'user', content: enhancedPrompt },
    ]

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 3000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from AI')
    }

    const parsed = JSON.parse(content) as AIResponse

    // Validate and enhance response
    if (!parsed.answer || !parsed.confidence?.score) {
      throw new Error('Invalid response structure')
    }

    // Add metadata about sources used
    if (!parsed.analysis) parsed.analysis = []
    if (perplexityContext) {
      parsed.analysis.push({
        text: 'This analysis incorporates real-time web research via Perplexity AI for current information.',
      })
    }

    return parsed
  } catch (error) {
    console.error('Advanced Research Error:', error)
    
    return {
      answer: 'Unable to generate an advanced research response. Please try again or check your API configuration.',
      key_facts: [],
      analysis: [],
      uncertainties: ['AI service error occurred'],
      next_signals: [],
      confidence: { score: 0, rationale: 'Error during processing' },
    }
  }
}

/**
 * Generate daily briefing from clusters using Perplexity
 */
export async function generateBriefing(
  clusters: { title: string; summary: string | null; countries: string[]; topics: string[]; severity: number; sources: { name: string; url: string }[] }[]
): Promise<BriefingItem[]> {
  try {
    const clusterText = clusters
      .map((c, i) => 
        `[${i + 1}] ${c.title}\nSeverity: ${c.severity}\nCountries: ${c.countries.join(', ')}\nTopics: ${c.topics.join(', ')}\nSummary: ${c.summary || 'N/A'}\nSources: ${c.sources.map(s => `${s.name} (${s.url})`).join(', ')}`
      )
      .join('\n\n')

    const userPrompt = `Generate today's intelligence briefing from these event clusters:\n\n${clusterText}\n\nUse Perplexity to enrich the briefing with current information, verify facts, and provide context. Respond with a JSON array of briefing items following the exact structure specified.`

    const { parsed, raw } = await perplexityChatJSON<BriefingItem[]>({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: BRIEFING_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    })

    if (!parsed) {
      console.error('Failed to parse briefing JSON. Raw response:', raw)
      // Intentar extraer manualmente si es un objeto con items
      try {
        const fallbackParsed = JSON.parse(raw)
        const items = Array.isArray(fallbackParsed) ? fallbackParsed : fallbackParsed.items || []
        if (items.length > 0) {
          return items.slice(0, 7) as BriefingItem[]
        }
      } catch {
        // Si falla, continuar con el error
      }
      throw new Error('Failed to parse briefing response as JSON array')
    }

    const items = Array.isArray(parsed) ? parsed : []
    return items.slice(0, 7) as BriefingItem[]
  } catch (error) {
    console.error('AI Briefing Error:', error)
    return []
  }
}

/**
 * Generate red team analysis for hypothesis
 */
export async function generateRedTeam(
  hypothesis: { title: string; statement: string; assumptions: string[]; evidence: string[] }
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: RED_TEAM_PROMPT },
        {
          role: 'user',
          content: `Analyze this hypothesis:\n\nTitle: ${hypothesis.title}\nStatement: ${hypothesis.statement}\nAssumptions: ${hypothesis.assumptions.join(', ')}\nEvidence: ${hypothesis.evidence.join(', ')}\n\nProvide a thorough red team analysis.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    })

    return response.choices[0]?.message?.content || 'Unable to generate red team analysis.'
  } catch (error) {
    console.error('AI Red Team Error:', error)
    return 'Unable to generate red team analysis. Please try again.'
  }
}

/**
 * Generate pre-mortem analysis for hypothesis
 */
export async function generatePremortem(
  hypothesis: { title: string; statement: string; timeframe: string }
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: PREMORTEM_PROMPT },
        {
          role: 'user',
          content: `Conduct a pre-mortem for this hypothesis:\n\nTitle: ${hypothesis.title}\nStatement: ${hypothesis.statement}\nTimeframe: ${hypothesis.timeframe}\n\nAssume it has completely failed. What went wrong?`,
        },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    })

    return response.choices[0]?.message?.content || 'Unable to generate pre-mortem analysis.'
  } catch (error) {
    console.error('AI Pre-mortem Error:', error)
    return 'Unable to generate pre-mortem analysis. Please try again.'
  }
}

/**
 * Suggest causal graph connections with advanced analysis
 */
export async function suggestCausalConnections(
  nodes: { id: string; label: string; type: string }[],
  existingEdges: { source: string; target: string; type: string }[]
): Promise<{ source: string; target: string; type: string; rationale: string }[]> {
  try {
    const nodesText = nodes.map((n) => `${n.id}: ${n.label} (${n.type})`).join('\n')
    const edgesText = existingEdges.map((e) => `${e.source} --${e.type}--> ${e.target}`).join('\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert in causal analysis and geopolitical systems thinking. 
You suggest causal connections for intelligence analysis graphs.

Edge types:
- causes: Direct causal relationship (A causes B)
- correlates: Correlation without clear causation
- triggers: Event A triggers event B (specific conditions)
- constrains: A limits or constrains B

Only suggest connections that are:
1. Evidence-based and well-established
2. Geopolitically relevant
3. Logically sound
4. Not redundant with existing edges

Respond in JSON format: {"suggestions": [{"source": "node_id", "target": "node_id", "type": "causes", "rationale": "detailed explanation"}]}`,
        },
        {
          role: 'user',
          content: `Analyze this causal graph and suggest 3-7 new connections:\n\nNODES:\n${nodesText}\n\nEXISTING EDGES:\n${edgesText || 'None'}\n\nSuggest connections with strong rationales based on geopolitical analysis.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return []

    const parsed = JSON.parse(content)
    return Array.isArray(parsed.suggestions) ? parsed.suggestions : []
  } catch (error) {
    console.error('AI Causal Suggestions Error:', error)
    return []
  }
}

/**
 * Generate playbook with AI assistance
 */
export async function generatePlaybook(
  actorType: 'company' | 'investor' | 'individual' | 'government',
  objective: string,
  context?: { clusters?: any[]; hypotheses?: any[]; currentEvents?: string },
  language: 'es' | 'en' = 'es'
): Promise<{
  title: string
  objective: string
  options: Array<{ name: string; description: string; trade_offs: string }>
  triggers: string[]
  type_i_cost: string
  type_ii_cost: string
  checklist: string[]
  response_72h: string
}> {
  try {
    const contextText = context
      ? `\n\nCONTEXT:\n${context.currentEvents || ''}\n${context.clusters?.map((c) => `- ${c.canonical_title}: ${c.summary}`).join('\n') || ''}\n${context.hypotheses?.map((h) => `- Hypothesis: ${h.title} (${h.prob_current}% prob)`).join('\n') || ''}`
      : ''

    const languageInstruction = language === 'es' 
      ? 'IMPORTANTE: Genera TODO el contenido en español. Todos los textos, títulos, descripciones y planes deben estar en español.'
      : 'IMPORTANT: Generate ALL content in English. All texts, titles, descriptions, and plans must be in English.'

    const systemPrompt = language === 'es'
      ? `Eres un planificador estratégico senior creando planes de acción para operaciones de inteligencia.

DEBES responder SOLO con un objeto JSON válido. Sin markdown, sin bloques de código, solo JSON puro.

La estructura JSON DEBE ser exactamente:
{
  "title": "string - Un título claro y accionable",
  "objective": "string - La declaración del objetivo",
  "options": [
    {
      "name": "string - Nombre de la opción",
      "description": "string - Descripción detallada",
      "trade_offs": "string - Pros y contras"
    }
  ],
  "triggers": ["string", "string", "string"],
  "type_i_cost": "string - Descripción del costo del error tipo I",
  "type_ii_cost": "string - Descripción del costo del error tipo II",
  "checklist": ["string", "string", "string"],
  "response_72h": "string - Plan de respuesta detallado de 72 horas"
}

REQUISITOS:
- "options": DEBE ser un array con al menos 3 elementos, cada uno con "name", "description" y "trade_offs"
- "triggers": DEBE ser un array con al menos 5 strings
- "checklist": DEBE ser un array con al menos 10 strings
- "type_i_cost": DEBE ser un string no vacío describiendo el costo de actuar cuando no se debería
- "type_ii_cost": DEBE ser un string no vacío describiendo el costo de no actuar cuando se debería
- "response_72h": DEBE ser un plan de respuesta detallado, de múltiples párrafos
- TODOS los campos son REQUERIDOS y DEBEN contener contenido sustancial
- Sé específico, accionable y enfocado en inteligencia`
      : `You are a senior strategic planner creating action playbooks for intelligence operations. 

You MUST respond ONLY with a valid JSON object. No markdown, no code blocks, just pure JSON.

The JSON structure MUST be exactly:
{
  "title": "string - A clear, actionable title",
  "objective": "string - The objective statement",
  "options": [
    {
      "name": "string - Option name",
      "description": "string - Detailed description",
      "trade_offs": "string - Pros and cons"
    }
  ],
  "triggers": ["string", "string", "string"],
  "type_i_cost": "string - Type I error cost description",
  "type_ii_cost": "string - Type II error cost description",
  "checklist": ["string", "string", "string"],
  "response_72h": "string - Detailed 72-hour plan"
}

REQUIREMENTS:
- "options": MUST be an array with at least 3 items, each with "name", "description", and "trade_offs"
- "triggers": MUST be an array with at least 5 strings
- "checklist": MUST be an array with at least 10 strings
- "type_i_cost": MUST be a non-empty string describing the cost of acting when you shouldn't
- "type_ii_cost": MUST be a non-empty string describing the cost of not acting when you should
- "response_72h": MUST be a detailed, multi-paragraph response plan
- ALL fields are REQUIRED and MUST contain substantive content
- Be specific, actionable, and intelligence-focused`

    const userPrompt = language === 'es'
      ? `Crea un plan de acción completo para un ${actorType === 'company' ? 'empresa' : actorType === 'investor' ? 'inversor' : actorType === 'individual' ? 'individuo' : 'gobierno'} con este objetivo: "${objective}"${contextText}

IMPORTANTE: Debes generar TODOS los campos con contenido sustancial:
- Al menos 3 opciones estratégicas con detalles completos
- Al menos 5 activadores
- Al menos 10 elementos de lista de verificación
- Costos detallados de errores tipo I y tipo II
- Un plan de respuesta integral de 72 horas

Devuelve SOLO el objeto JSON, sin otro texto.`
      : `Create a complete playbook for a ${actorType} with this objective: "${objective}"${contextText}

IMPORTANT: You must generate ALL fields with substantive content:
- At least 3 strategic options with full details
- At least 5 activation triggers
- At least 10 checklist items
- Detailed Type I and Type II error costs
- A comprehensive 72-hour response plan

Return ONLY the JSON object, no other text.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}\n\n${languageInstruction}`,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Empty response')

    // Clean content - remove markdown code blocks if present
    let cleanedContent = content.trim()
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '')
    }

    const parsed = JSON.parse(cleanedContent)
    console.log('Playbook generation - Raw parsed response:', JSON.stringify(parsed, null, 2))
    
    // Validate and normalize options
    let options = []
    if (Array.isArray(parsed.options) && parsed.options.length > 0) {
      options = parsed.options.map((opt: any) => ({
        name: opt.name || opt.title || '',
        description: opt.description || opt.desc || '',
        trade_offs: opt.trade_offs || opt.tradeoffs || opt.tradeOffs || '',
      })).filter((opt: any) => opt.name && opt.description)
    }
    
    // Validate and normalize triggers
    let triggers: string[] = []
    if (Array.isArray(parsed.triggers) && parsed.triggers.length > 0) {
      triggers = parsed.triggers.filter((t: any) => t && typeof t === 'string' && t.trim())
    }
    
    // Validate and normalize checklist
    let checklist: string[] = []
    if (Array.isArray(parsed.checklist) && parsed.checklist.length > 0) {
      checklist = parsed.checklist.filter((c: any) => c && typeof c === 'string' && c.trim())
    }
    
    // Ensure all required fields exist with defaults
    const result = {
      title: parsed.title || 'Untitled Playbook',
      objective: parsed.objective || objective,
      options: options.length > 0 ? options : [],
      triggers: triggers.length > 0 ? triggers : [],
      type_i_cost: parsed.type_i_cost || parsed.typeI_cost || parsed['type_i_cost'] || '',
      type_ii_cost: parsed.type_ii_cost || parsed.typeII_cost || parsed['type_ii_cost'] || '',
      checklist: checklist.length > 0 ? checklist : [],
      response_72h: parsed.response_72h || parsed.response72h || parsed['response_72h'] || '',
    }
    
    // Log warning if fields are empty
    if (result.options.length === 0 || result.triggers.length === 0 || result.checklist.length === 0) {
      console.warn('Playbook generation - Some fields are empty:', {
        options: result.options.length,
        triggers: result.triggers.length,
        checklist: result.checklist.length,
        type_i_cost: result.type_i_cost ? 'filled' : 'empty',
        type_ii_cost: result.type_ii_cost ? 'filled' : 'empty',
        response_72h: result.response_72h ? 'filled' : 'empty',
      })
    }
    
    return result
  } catch (error) {
    console.error('Playbook generation error:', error)
    throw error
  }
}

/**
 * Generate hypothesis with deep analysis
 */
export async function generateHypothesisAnalysis(
  hypothesis: { title: string; statement: string; assumptions: string[] },
  evidence: string[] = [],
  language: 'es' | 'en' = 'es'
): Promise<{
  confirmSignals: string[]
  falsifySignals: string[]
  probabilityEstimate: number
  rationale: string
  similarHistoricalCases: string[]
}> {
  try {
    const evidenceText = evidence.length > 0 ? `\n\nEVIDENCE:\n${evidence.map((e, i) => `${i + 1}. ${e}`).join('\n')}` : ''

    const languageInstruction = language === 'es' 
      ? 'IMPORTANTE: Genera TODO el contenido en español. Todas las señales, explicaciones y casos históricos deben estar en español.'
      : 'IMPORTANT: Generate ALL content in English. All signals, explanations, and historical cases must be in English.'

    const systemPrompt = language === 'es'
      ? `Eres un analista de inteligencia senior especializado en pruebas de hipótesis y razonamiento probabilístico.

DEBES responder SOLO con un objeto JSON válido. Sin markdown, sin bloques de código, solo JSON puro.

La estructura JSON DEBE ser exactamente:
{
  "confirmSignals": ["señal 1", "señal 2", "señal 3"],
  "falsifySignals": ["señal 1", "señal 2", "señal 3"],
  "probabilityEstimate": 50,
  "rationale": "Texto de explicación",
  "similarHistoricalCases": ["caso 1", "caso 2", "caso 3"]
}

REQUISITOS:
- "confirmSignals": DEBE ser un array de strings (5-10 elementos)
- "falsifySignals": DEBE ser un array de strings (5-10 elementos)
- "probabilityEstimate": DEBE ser un número entre 0-100 que represente el porcentaje de probabilidad de que la hipótesis sea verdadera. Calcula esta probabilidad basándote en:
  * La plausibilidad de la hipótesis según el contexto geopolítico actual
  * La evidencia disponible (si se proporciona)
  * Factores históricos y precedentes similares
  * La probabilidad realista considerando todos los factores en contra y a favor
  * Usa una escala de 0-100 donde 0 = imposible, 50 = igualmente probable/improbable, 100 = casi seguro
- "rationale": DEBE ser un string no vacío explicando detalladamente cómo calculaste la probabilidad y por qué
- "similarHistoricalCases": DEBE ser un array de strings (3-5 elementos)
- TODOS los campos son REQUERIDOS
- Las señales deben ser eventos específicos y observables`
      : `You are a senior intelligence analyst specializing in hypothesis testing and probabilistic reasoning.

You MUST respond ONLY with a valid JSON object. No markdown, no code blocks, just pure JSON.

The JSON structure MUST be exactly:
{
  "confirmSignals": ["signal 1", "signal 2", "signal 3"],
  "falsifySignals": ["signal 1", "signal 2", "signal 3"],
  "probabilityEstimate": 50,
  "rationale": "Explanation text",
  "similarHistoricalCases": ["case 1", "case 2", "case 3"]
}

REQUIREMENTS:
- "confirmSignals": MUST be an array of strings (5-10 items)
- "falsifySignals": MUST be an array of strings (5-10 items)
- "probabilityEstimate": MUST be a number between 0-100 representing the percentage probability that the hypothesis is true. Calculate this probability based on:
  * The plausibility of the hypothesis given current geopolitical context
  * Available evidence (if provided)
  * Historical factors and similar precedents
  * Realistic probability considering all factors for and against
  * Use a scale of 0-100 where 0 = impossible, 50 = equally likely/unlikely, 100 = almost certain
- "rationale": MUST be a non-empty string explaining in detail how you calculated the probability and why
- "similarHistoricalCases": MUST be an array of strings (3-5 items)
- ALL fields are REQUIRED
- Signals should be specific, observable events`

    const userPrompt = language === 'es'
      ? `Analiza esta hipótesis:\n\nTítulo: ${hypothesis.title}\nDeclaración: ${hypothesis.statement}\nSuposiciones: ${hypothesis.assumptions.join(', ')}${evidenceText}

IMPORTANTE sobre "probabilityEstimate":
- Debes calcular una probabilidad REALISTA entre 0-100 basándote en el análisis objetivo de la hipótesis
- Considera factores como: plausibilidad geopolítica, precedentes históricos, evidencia disponible, barreras legales/diplomáticas, costos y beneficios
- NO uses valores extremos (0 o 100) a menos que sea absolutamente justificable
- Para hipótesis altamente improbables pero técnicamente posibles, usa valores bajos (1-15%)
- Para hipótesis plausibles pero inciertas, usa valores medios (20-60%)
- Para hipótesis muy probables, usa valores altos (70-95%)
- El valor debe ser un número entero entre 0-100

Genera un análisis completo siguiendo la estructura JSON especificada. Devuelve SOLO el objeto JSON, sin otro texto.`
      : `Analyze this hypothesis:\n\nTitle: ${hypothesis.title}\nStatement: ${hypothesis.statement}\nAssumptions: ${hypothesis.assumptions.join(', ')}${evidenceText}

IMPORTANT about "probabilityEstimate":
- You must calculate a REALISTIC probability between 0-100 based on objective analysis of the hypothesis
- Consider factors such as: geopolitical plausibility, historical precedents, available evidence, legal/diplomatic barriers, costs and benefits
- DO NOT use extreme values (0 or 100) unless absolutely justifiable
- For highly improbable but technically possible hypotheses, use low values (1-15%)
- For plausible but uncertain hypotheses, use medium values (20-60%)
- For very probable hypotheses, use high values (70-95%)
- The value must be an integer between 0-100

Generate a complete analysis following the JSON structure specified. Return ONLY the JSON object, no other text.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}\n\n${languageInstruction}`,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 3000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Empty response')

    // Clean content - remove markdown code blocks if present
    let cleanedContent = content.trim()
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '')
    }

    const parsed = JSON.parse(cleanedContent)
    console.log('Hypothesis analysis - Raw parsed response:', JSON.stringify(parsed, null, 2))

    // Normalize field names - handle both camelCase and snake_case
    const confirmSignalsRaw = parsed.confirmSignals || parsed.confirmation_signals || parsed.confirm_signals || []
    const falsifySignalsRaw = parsed.falsifySignals || parsed.falsification_signals || parsed.falsify_signals || []
    
    // Extract signals - handle both string arrays and object arrays with "signal" property
    const extractSignals = (signals: any[]): string[] => {
      if (!Array.isArray(signals)) return []
      return signals
        .map((s) => {
          if (typeof s === 'string') return s.trim()
          if (s && typeof s === 'object' && s.signal) return String(s.signal).trim()
          if (s && typeof s === 'object' && s.text) return String(s.text).trim()
          return null
        })
        .filter((s): s is string => s !== null && s !== '')
    }

    const confirmSignals = extractSignals(confirmSignalsRaw)
    const falsifySignals = extractSignals(falsifySignalsRaw)

    // Normalize probability estimate
    const probabilityEstimate = 
      parsed.probabilityEstimate !== undefined ? parsed.probabilityEstimate :
      parsed.initial_probability_estimate !== undefined ? parsed.initial_probability_estimate :
      parsed.prob_initial !== undefined ? parsed.prob_initial :
      50

    // Normalize rationale
    const rationale = 
      parsed.rationale || 
      parsed.rationale_for_probability_estimate || 
      parsed.rationaleForProbabilityEstimate || 
      ''

    // Normalize historical cases
    const similarHistoricalCasesRaw = 
      parsed.similarHistoricalCases || 
      parsed.similar_historical_cases || 
      parsed.historical_cases || 
      []
    
    const extractHistoricalCases = (cases: any[]): string[] => {
      if (!Array.isArray(cases)) return []
      return cases
        .map((c) => {
          if (typeof c === 'string') return c.trim()
          if (c && typeof c === 'object' && c.case) return String(c.case).trim()
          if (c && typeof c === 'object' && c.title) return String(c.title).trim()
          return null
        })
        .filter((c): c is string => c !== null && c !== '')
    }

    const similarHistoricalCases = extractHistoricalCases(similarHistoricalCasesRaw)

    const result = {
      confirmSignals: confirmSignals.length > 0 ? confirmSignals : [],
      falsifySignals: falsifySignals.length > 0 ? falsifySignals : [],
      probabilityEstimate: Math.max(0, Math.min(100, Number(probabilityEstimate))),
      rationale: rationale || '',
      similarHistoricalCases: similarHistoricalCases.length > 0 ? similarHistoricalCases : [],
    }

    // Log warning if fields are empty
    if (result.confirmSignals.length === 0 || result.falsifySignals.length === 0) {
      console.warn('Hypothesis analysis - Some fields are empty:', {
        confirmSignals: result.confirmSignals.length,
        falsifySignals: result.falsifySignals.length,
        probabilityEstimate: result.probabilityEstimate,
        rationale: result.rationale ? 'filled' : 'empty',
        similarHistoricalCases: result.similarHistoricalCases.length,
      })
    }

    return result
  } catch (error) {
    console.error('Hypothesis analysis error:', error)
    throw error
  }
}

/**
 * Generate causal graph from clusters/events
 */
export async function generateCausalGraphFromEvents(
  events: Array<{ title: string; summary: string; countries: string[]; topics: string[] }>,
  focus?: string
): Promise<{
  title: string
  description: string
  nodes: Array<{ 
    id: string
    label: string
    type: 'event' | 'mechanism' | 'variable' | 'actor' | 'outcome'
    description?: string
    temporalOrder?: number
    context?: string
    position: { x: number; y: number }
  }>
  edges: Array<{ 
    source: string
    target: string
    type: 'causes' | 'correlates' | 'triggers' | 'constrains'
    rationale: string
  }>
}> {
  try {
    const eventsText = events.map((e, i) => `[${i + 1}] ${e.title}\n${e.summary}\nCountries: ${e.countries.join(', ')}\nTopics: ${e.topics.join(', ')}`).join('\n\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en análisis causal y pensamiento sistémico para análisis de inteligencia geopolítica.
Crea grafos causales que mapeen relaciones entre eventos, actores, mecanismos y resultados.

TIPOS DE NODOS:
- event: Eventos específicos que ocurrieron (deben estar ordenados cronológicamente)
- mechanism: Mecanismos causales o procesos que conectan eventos
- variable: Factores que influyen en los resultados
- actor: Actores clave (países, organizaciones, individuos)
- outcome: Resultados o consecuencias

TIPOS DE EDGES:
- causes: Causación directa (A causa B)
- correlates: Correlación (A se correlaciona con B)
- triggers: Condiciones desencadenantes específicas (A dispara B)
- constrains: Factores limitantes (A restringe B)

IMPORTANTE:
1. Los eventos deben estar ordenados CRONOLÓGICAMENTE según cuándo ocurrieron
2. Cada nodo debe tener una descripción detallada explicando qué es y por qué es importante
3. Cada nodo evento debe tener un temporalOrder (1 = más antiguo, números mayores = más recientes)
4. Cada edge debe tener una rationale detallada explicando POR QUÉ existe esa conexión
5. La estructura debe seguir un flujo lógico: causas → eventos → mecanismos → resultados
6. Incluye contexto geopolítico relevante en los nodos cuando sea apropiado

Responde en formato JSON con esta estructura exacta:
{
  "title": "Título descriptivo del grafo",
  "description": "Descripción completa explicando el contexto y propósito del grafo",
  "nodes": [
    {
      "id": "node-1",
      "label": "Nombre corto del nodo",
      "type": "event",
      "description": "Descripción detallada de qué es este nodo y su importancia",
      "temporalOrder": 1,
      "context": "Contexto geopolítico relevante si aplica"
    }
  ],
  "edges": [
    {
      "source": "node-1",
      "target": "node-2",
      "type": "causes",
      "rationale": "Explicación detallada de por qué existe esta conexión causal"
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Crea un grafo causal a partir de estos eventos:\n\n${eventsText}${focus ? `\n\nEnfócate en: ${focus}` : ''}

REQUISITOS:
1. Ordena los eventos CRONOLÓGICAMENTE (los más antiguos primero)
2. Crea una estructura lógica que muestre el flujo causal desde causas hasta resultados
3. Incluye 8-15 nodos bien explicados (eventos, actores clave, mecanismos, resultados)
4. Incluye 10-20 edges con explicaciones concisas pero claras de cada conexión
5. Cada nodo debe tener:
   - label: Nombre corto y claro (máximo 5 palabras)
   - description: Explicación breve pero completa (1-2 oraciones, máximo 150 caracteres)
   - temporalOrder: Orden cronológico (solo para eventos)
   - context: Contexto geopolítico breve cuando sea relevante (máximo 50 caracteres)
6. Cada edge debe tener una rationale concisa que explique la relación causal (máximo 100 caracteres)

La descripción del grafo debe ser completa pero concisa, explicando el contexto general, los actores involucrados y las implicaciones principales (máximo 300 caracteres).

IMPORTANTE: Sé conciso pero completo. Prioriza la claridad sobre la extensión.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 4000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Empty response')

    let cleanedContent = content.trim()
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '')
    }

    const parsed = JSON.parse(cleanedContent)
    
    // Sort nodes by temporal order (events first, then by temporalOrder)
    const sortedNodes = [...(parsed.nodes || [])].sort((a: any, b: any) => {
      // Events with temporalOrder come first
      if (a.type === 'event' && b.type === 'event') {
        const orderA = a.temporalOrder ?? 999
        const orderB = b.temporalOrder ?? 999
        return orderA - orderB
      }
      if (a.type === 'event') return -1
      if (b.type === 'event') return 1
      // Then actors, then mechanisms, then variables, then outcomes
      const typeOrder: Record<string, number> = {
        actor: 1,
        mechanism: 2,
        variable: 3,
        outcome: 4,
      }
      return (typeOrder[a.type] ?? 5) - (typeOrder[b.type] ?? 5)
    })

    // Calculate positions based on causal structure and temporal order
    const nodesWithPositions = sortedNodes.map((node: any, i: number) => {
      // Create a layered layout: causes/actors on left, events in middle, outcomes on right
      let x = 100
      let y = 100
      
      if (node.type === 'actor') {
        x = 50
        y = 100 + (i % 6) * 120
      } else if (node.type === 'event') {
        // Events flow horizontally based on temporal order
        const temporalOrder = node.temporalOrder ?? i + 1
        x = 300 + (temporalOrder - 1) * 250
        y = 200 + (i % 4) * 150
      } else if (node.type === 'mechanism') {
        x = 400 + (i % 3) * 200
        y = 500 + Math.floor(i / 3) * 120
      } else if (node.type === 'variable') {
        x = 200 + (i % 4) * 180
        y = 600 + Math.floor(i / 4) * 120
      } else if (node.type === 'outcome') {
        x = 800 + (i % 3) * 200
        y = 300 + Math.floor(i / 3) * 150
      } else {
        // Fallback positioning
        x = 100 + (i % 5) * 200
        y = 100 + Math.floor(i / 5) * 150
      }

      return {
        ...node,
        position: { x, y },
      }
    })

    return {
      title: parsed.title || 'Grafo causal',
      description: parsed.description || '',
      nodes: nodesWithPositions,
      edges: parsed.edges || [],
    }
  } catch (error) {
    console.error('Causal graph generation error:', error)
    throw error
  }
}

// Re-export market analysis functions
export { generateMarketAnalysis, generateMarketEventLinks, type MarketAnalysis } from './markets'

