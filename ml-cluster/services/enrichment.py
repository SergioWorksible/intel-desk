"""
Cluster enrichment service with GPT
"""
import os
import json
import logging
from typing import Dict, List, Optional, Any
from openai import OpenAI

logger = logging.getLogger(__name__)

CLUSTER_ENRICHMENT_PROMPT = """Eres un analista de inteligencia geopolítica y mercados para Intel Desk.
Analiza este grupo de artículos de noticias y proporciona un análisis completo y estructurado.

Debes responder SOLO en formato JSON con esta estructura exacta:
{
  "canonical_title": "Título canónico preciso que resume el evento principal",
  "summary": "Resumen ejecutivo de 2-3 párrafos del evento geopolítico, incluyendo contexto y consecuencias",
  "countries": ["País1", "País2"],
  "topics": ["tema1", "tema2", "tema3"],
  "entities": {
    "people": ["Persona 1", "Persona 2"],
    "organizations": ["Org 1", "Org 2", "Org 3"],
    "locations": ["Ciudad 1", "Región 1"],
    "events": ["Evento clave 1", "Evento clave 2"]
  },
  "severity": 75,
  "confidence": 85,
  "geopolitical_implications": [
    "Implicación específica y accionable 1",
    "Implicación específica y accionable 2"
  ],
  "key_signals": [
    "Señal observable específica a monitorear",
    "Otra señal importante"
  ],
  "market_impact": {
    "affected_sectors": ["Energía", "Defensa", "Tecnología"],
    "affected_regions": ["Europa", "Asia-Pacífico"],
    "potential_symbols": ["OIL", "XLE", "ITA"],
    "risk_level": "high|medium|low",
    "timeframe": "immediate|short_term|medium_term|long_term"
  },
  "map_data": {
    "primary_locations": [
      {
        "name": "Kiev",
        "coordinates": {"lat": 50.4501, "lng": 30.5234},
        "significance": "primary|secondary|tertiary"
      }
    ],
    "affected_regions": ["Europa del Este", "Mar Negro"],
    "conflict_zones": ["Donbas"]
  }
}

REGLAS CRÍTICAS:

1. Severity (0-100): Basado en impacto geopolítico REAL
   - 80-100: Cambios de régimen, conflictos mayores, cambios en equilibrio de poder
   - 60-79: Eventos significativos con impacto regional/global
   - 40-59: Eventos importantes pero limitados
   - 0-39: Eventos menores o rutinarios

2. Confidence (0-100): Basado en calidad y consistencia de fuentes
   - 80-100: Múltiples fuentes confiables confirman
   - 60-79: Información consistente pero fuentes limitadas
   - 40-59: Información parcial o contradictoria
   - 0-39: Información muy limitada

3. Market Impact:
   - affected_sectors: Sectores económicos directamente afectados (Energía, Defensa, Tecnología, Finanzas, etc.)
   - affected_regions: Regiones geográficas económicas afectadas
   - potential_symbols: Símbolos de mercado relevantes (tickers, ETFs, índices) si aplica
   - risk_level: Nivel de riesgo para inversores
   - timeframe: Cuándo se espera el impacto

4. Map Data:
   - primary_locations: Ubicaciones específicas mencionadas con coordenadas si conoces
   - affected_regions: Regiones geográficas amplias afectadas
   - conflict_zones: Zonas de conflicto específicas si aplica

5. Extrae TODAS las entidades relevantes: líderes, organizaciones, ubicaciones específicas

6. Las implicaciones deben ser específicas y accionables, no genéricas

7. Las señales deben ser observables y medibles

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional."""


class EnrichmentService:
    """Servicio para enriquecer clusters con análisis de GPT"""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OPENAI_API_KEY no configurada - el enriquecimiento no estará disponible")
            self.client = None
        else:
            self.client = OpenAI(api_key=api_key)
    
    def enrich_cluster(
        self,
        cluster: Dict[str, Any],
        articles: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Enriquece un cluster con análisis de GPT.
        
        Args:
            cluster: Diccionario con datos del cluster
            articles: Lista de artículos del cluster
            
        Returns:
            Diccionario con el análisis enriquecido o None si falla
        """
        if not self.client:
            logger.debug("OpenAI no disponible, saltando enriquecimiento")
            return None
        
        if not articles:
            logger.warning(f"Cluster {cluster.get('id')} no tiene artículos")
            return None
        
        try:
            # Preparar contexto de artículos (máximo 10)
            articles_context = []
            for i, article in enumerate(articles[:10], 1):
                countries = ", ".join(article.get("countries", [])) or "N/A"
                topics = ", ".join(article.get("topics", [])) or "N/A"
                snippet = (article.get("snippet") or "")[:300] or "N/A"
                published_at = article.get("published_at") or "N/A"
                
                article_text = f"""Artículo {i}:
Título: {article.get('title', 'N/A')}
Fuente: {article.get('domain', 'N/A')}
Fecha: {published_at}
Países: {countries}
Temas: {topics}
Snippet: {snippet}"""
                articles_context.append(article_text)
            
            articles_text = "\n\n".join(articles_context)
            
            prompt = f"""{CLUSTER_ENRICHMENT_PROMPT}

ARTÍCULOS A ANALIZAR:
{articles_text}

Analiza estos artículos y proporciona el análisis completo en formato JSON."""
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un analista experto de inteligencia geopolítica y mercados. Responde siempre en formato JSON válido."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            if not content:
                logger.error("Respuesta vacía de OpenAI")
                return None
            
            analysis = json.loads(content)
            
            # Validar y limpiar el análisis
            return {
                "canonical_title": analysis.get("canonical_title") or cluster.get("canonical_title", ""),
                "summary": analysis.get("summary") or "",
                "countries": analysis.get("countries", [])[:15] if isinstance(analysis.get("countries"), list) else [],
                "topics": analysis.get("topics", [])[:15] if isinstance(analysis.get("topics"), list) else [],
                "entities": {
                    "people": analysis.get("entities", {}).get("people", [])[:20] if isinstance(analysis.get("entities", {}).get("people"), list) else [],
                    "organizations": analysis.get("entities", {}).get("organizations", [])[:20] if isinstance(analysis.get("entities", {}).get("organizations"), list) else [],
                    "locations": analysis.get("entities", {}).get("locations", [])[:20] if isinstance(analysis.get("entities", {}).get("locations"), list) else [],
                    "events": analysis.get("entities", {}).get("events", [])[:10] if isinstance(analysis.get("entities", {}).get("events"), list) else [],
                },
                "severity": max(0, min(100, analysis.get("severity", 50))),
                "confidence": max(0, min(100, analysis.get("confidence", 50))),
                "geopolitical_implications": analysis.get("geopolitical_implications", [])[:10] if isinstance(analysis.get("geopolitical_implications"), list) else [],
                "key_signals": analysis.get("key_signals", [])[:10] if isinstance(analysis.get("key_signals"), list) else [],
                "market_impact": analysis.get("market_impact"),
                "map_data": analysis.get("map_data")
            }
            
        except Exception as e:
            logger.error(f"Error enriqueciendo cluster {cluster.get('id')}: {e}", exc_info=True)
            return None
