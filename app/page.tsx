'use client'

import Link from 'next/link'
import { Shield, Github, Server, Zap, BookOpen, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GITHUB_REPO_URL } from '@/lib/constants'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-intel-bg text-intel-text">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-intel-accent/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 sm:py-24">
        {/* Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-intel-border/50 text-xs font-mono uppercase tracking-wider">
            <Code2 className="h-3.5 w-3.5 text-intel-accent" />
            Open source
          </span>
          <a
            href={`${GITHUB_REPO_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1 rounded-full border border-intel-border text-xs font-mono hover:border-intel-accent/50 transition-colors"
          >
            AGPL-3.0
          </a>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-intel-border hover:border-intel-accent/50 transition-colors text-xs"
          >
            <Github className="h-3.5 w-3.5" />
            GitHub
          </a>
        </div>

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="font-classified text-3xl sm:text-4xl md:text-5xl font-bold tracking-wider mb-4">
            INTEL DESK
          </h1>
          <p className="text-lg sm:text-xl text-intel-muted max-w-2xl mx-auto mb-2">
            Inteligencia geopolítica open source. Briefings diarios, clustering ML, análisis con evidencia.
          </p>
          <p className="text-sm text-intel-muted/80 mb-10">
            Self-host o úsala en la nube. Código público en GitHub.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="font-mono">
              <Link href="/login">
                <Zap className="mr-2 h-4 w-4" />
                Probar gratis
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="font-mono">
              <a href={`${GITHUB_REPO_URL}#quick-start`} target="_blank" rel="noopener noreferrer">
                <Server className="mr-2 h-4 w-4" />
                Self-host
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg" className="font-mono">
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4" />
                Ver código
              </a>
            </Button>
          </div>
        </div>

        {/* Value prop */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mb-20">
          {[
            { icon: Shield, title: 'Briefings diarios', desc: 'Resúmenes generados por IA con citas verificadas' },
            { icon: BookOpen, title: 'Clustering ML', desc: 'HDBSCAN + embeddings para agrupar eventos relacionados' },
            { icon: Zap, title: 'Mapas y mercados', desc: 'Visualización geográfica y mercados como sensores' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-lg border border-intel-border bg-intel-border/20">
              <Icon className="h-8 w-8 text-intel-accent mb-3" />
              <h3 className="font-medium mb-2">{title}</h3>
              <p className="text-sm text-intel-muted">{desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="border border-intel-border rounded-lg p-8 bg-intel-border/10">
          <h2 className="text-center font-mono text-xl mb-6">Transparente y simple</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="text-center p-6 rounded-lg border border-intel-border">
              <p className="font-mono text-2xl font-bold text-intel-accent mb-2">Self-host</p>
              <p className="text-3xl font-bold mb-2">Gratis</p>
              <p className="text-sm text-intel-muted mb-4">Código completo. Despliega tú mismo.</p>
              <Button variant="outline" size="sm" asChild>
                <a href={`${GITHUB_REPO_URL}#quick-start`} target="_blank" rel="noopener noreferrer">
                  Guía de despliegue
                </a>
              </Button>
            </div>
            <div className="text-center p-6 rounded-lg border border-intel-accent/30 bg-intel-accent/5">
              <p className="font-mono text-2xl font-bold text-intel-accent mb-2">Hosted</p>
              <p className="text-3xl font-bold mb-2">~29€/año</p>
              <p className="text-sm text-intel-muted mb-4">Instancia gestionada, backups, actualizaciones.</p>
              <Button size="sm" asChild>
                <Link href="/signup">Empezar</Link>
              </Button>
            </div>
          </div>
          <p className="text-center text-xs text-intel-muted mt-6">
            El código es 100% open source. Nadie paga por funcionalidad cerrada.
          </p>
        </div>

        {/* Community */}
        <div className="mt-16 text-center">
          <p className="text-intel-muted text-sm mb-4">
            Construido por y para analistas. Contribuciones bienvenidas.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href={`${GITHUB_REPO_URL}/blob/main/CONTRIBUTING.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-intel-accent hover:underline"
            >
              Contribuir
            </a>
            <a
              href={`${GITHUB_REPO_URL}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-intel-accent hover:underline"
            >
              Issues
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
