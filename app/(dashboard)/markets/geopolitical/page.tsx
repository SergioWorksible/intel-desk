'use client'

import { GeopoliticalTopics } from '../components/geopolitical-topics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoDropdown } from '@/components/ui/info-dropdown'
import { Link2 } from 'lucide-react'

export default function GeopoliticalMarketsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link2 className="h-6 w-6 text-intel-accent" />
          <div>
            <h1 className="text-2xl font-mono font-semibold text-intel-text">
              Mercados geopolíticos
            </h1>
            <p className="text-sm text-intel-muted mt-1">
              Eventos geopolíticos vinculados a símbolos de mercado
            </p>
          </div>
        </div>
        <InfoDropdown
          title="Mercados geopolíticos"
          content={
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">¿Qué es esto?</p>
                <p className="text-xs text-intel-text/80 mb-2">
                  Esta página muestra cómo los eventos geopolíticos se vinculan automáticamente con símbolos de mercado usando IA.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Proceso automático:</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-intel-accent mt-0.5">1.</span>
                    <span>Se crea un evento geopolítico (cluster) con temas como "energy", "defense", etc.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-intel-accent mt-0.5">2.</span>
                    <span>La IA analiza el evento y busca símbolos de mercado relevantes basándose en sector, país, y tipo.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-intel-accent mt-0.5">3.</span>
                    <span>Se crean vínculos automáticos entre el evento y los símbolos afectados con explicación del impacto.</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-intel-border">
                <p className="text-xs text-intel-muted">
                  <strong>Ejemplo:</strong> Un evento sobre "sanciones energéticas" se vincula automáticamente a símbolos de energía como XOM, CVX, etc., con explicación de cómo los afecta.
                </p>
              </div>
            </div>
          }
          side="left"
        />
      </div>

      {/* Geopolitical Topics */}
      <GeopoliticalTopics />
    </div>
  )
}

