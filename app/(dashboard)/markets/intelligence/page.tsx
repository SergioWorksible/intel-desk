'use client'

import { MarketIntelligencePanel } from '../components/market-intelligence-panel'
import { InfoDropdown } from '@/components/ui/info-dropdown'
import { Brain } from 'lucide-react'

export default function MarketIntelligencePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-intel-accent" />
          <div>
            <h1 className="text-2xl font-mono font-semibold text-intel-text">
              Market Intelligence
            </h1>
            <p className="text-sm text-intel-muted mt-1">
              Análisis de inteligencia de mercado basado en eventos geopolíticos
            </p>
          </div>
        </div>
        <InfoDropdown
          title="Market Intelligence"
          content={
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">¿Qué es esto?</p>
                <p className="text-xs text-intel-text/80 mb-2">
                  Sistema de inteligencia que analiza eventos geopolíticos y genera suposiciones y planes de acción para mercados.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Contenido del reporte:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>
                    <strong>Escenarios:</strong> posibles desarrollos y su impacto en símbolos
                  </li>
                  <li>
                    <strong>Hipótesis:</strong> suposiciones basadas en análisis geopolítico
                  </li>
                  <li>
                    <strong>Planes:</strong> estrategias de trading con condiciones de entrada/salida
                  </li>
                  <li>
                    <strong>Alertas:</strong> riesgos identificados y acciones recomendadas
                  </li>
                </ul>
              </div>
              <div className="pt-2 border-t border-intel-border">
                <p className="text-xs text-intel-muted">
                  Generado por IA en base a clusters de últimos 7 días y símbolos vinculados.
                </p>
              </div>
            </div>
          }
          side="left"
        />
      </div>

      {/* Market Intelligence Panel */}
      <MarketIntelligencePanel />
    </div>
  )
}

