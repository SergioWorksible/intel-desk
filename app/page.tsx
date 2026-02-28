'use client'

import Link from 'next/link'
import {
  Shield,
  Github,
  Server,
  Globe,
  MapPin,
  Brain,
  FileText,
  TrendingUp,
  Code2,
  ChevronRight,
  Check,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GITHUB_REPO_URL } from '@/lib/constants'

const features = [
  {
    icon: FileText,
    title: 'Daily briefings',
    desc: 'AI-generated summaries with verified facts and traceable citations. Your operational situation every morning.',
  },
  {
    icon: Brain,
    title: 'ML clustering',
    desc: 'HDBSCAN + multilingual embeddings. Automatically groups related events from 150+ sources.',
  },
  {
    icon: Globe,
    title: 'World map',
    desc: 'Interactive geographic visualization. Severity, countries, trends in real time.',
  },
  {
    icon: BarChart3,
    title: 'Markets as sensors',
    desc: '150+ symbols. Prices, volatility, and links to geopolitical events.',
  },
  {
    icon: TrendingUp,
    title: 'Hypotheses & playbooks',
    desc: 'Probabilistic forecasts, red team, pre-mortem. Action plans per actor (corporates, investors, governments).',
  },
  {
    icon: Shield,
    title: 'Real-time alerts',
    desc: 'Thresholds, volume, correlation. Notifications when it matters.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen h-screen bg-intel-bg text-intel-text overflow-x-hidden overflow-y-auto">
      {/* Atmospheric background */}
      <div className="fixed inset-0 bg-grid-pattern opacity-[0.07] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-intel-accent/8 via-transparent to-intel-accent/5 pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-intel-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
          <span className="font-classified text-lg tracking-widest text-intel-text">INTEL DESK</span>
          <div className="flex items-center gap-3">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md border border-intel-border hover:border-intel-accent/50 transition-colors"
            >
              <Github className="h-4 w-4" />
            </a>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Try free</Link>
            </Button>
          </div>
        </nav>

        {/* Hero */}
        <section className="px-4 sm:px-6 lg:px-8 pt-12 pb-24 sm:pt-20 sm:pb-32 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-intel-border bg-intel-surface/80 mb-8 text-xs font-mono uppercase tracking-widest text-intel-muted">
            <Code2 className="h-3.5 w-3.5 text-intel-accent" />
            Open source · AGPL-3.0
          </div>

          <h1 className="font-classified text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-intel-text-bright mb-6 leading-[1.1]">
            Geopolitical intelligence
            <br />
            <span className="text-intel-accent">that acts</span>
          </h1>

          <p className="text-lg sm:text-xl text-intel-muted max-w-2xl mx-auto mb-4 leading-relaxed">
            Daily briefings. ML clustering. Maps. Markets. Hypotheses. Analysis with evidence and full traceability.
          </p>

          <p className="text-sm text-intel-muted/80 mb-12 font-mono italic">
            &ldquo;Discipline thinking. Ground analysis. Act with evidence.&rdquo;
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="font-mono min-w-[180px]">
              <Link href="/signup">
                Try free
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="font-mono" asChild>
              <a href={`${GITHUB_REPO_URL}#quick-start`} target="_blank" rel="noopener noreferrer">
                <Server className="mr-2 h-4 w-4" />
                Self-host
              </a>
            </Button>
          </div>
        </section>

        {/* Features grid */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 max-w-6xl mx-auto">
          <h2 className="font-mono text-sm uppercase tracking-widest text-intel-muted mb-12 text-center">
            Capabilities
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group p-6 rounded-lg border border-intel-border bg-intel-surface/50 hover:border-intel-accent/30 hover:bg-intel-surface/80 transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-intel-border/50 group-hover:bg-intel-accent/20 transition-colors">
                    <Icon className="h-6 w-6 text-intel-accent" />
                  </div>
                  <h3 className="font-medium text-intel-text">{title}</h3>
                </div>
                <p className="text-sm text-intel-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works / CTA */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 max-w-4xl mx-auto">
          <div className="border border-intel-border rounded-xl p-8 sm:p-12 bg-gradient-to-b from-intel-surface/80 to-intel-bg">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="h-5 w-5 text-intel-accent" />
              <span className="font-mono text-xs uppercase tracking-widest text-intel-muted">
                Two paths
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-intel-text-bright mb-4">
              Self-host or use it in the cloud
            </h2>
            <p className="text-intel-muted mb-8 max-w-xl">
              The code is public. Inspect, modify, deploy yourself. Or let us run it for you.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-lg border border-intel-border bg-intel-bg/50">
                <p className="font-mono text-intel-accent font-semibold mb-2">Self-host</p>
                <p className="text-3xl font-bold mb-2">Free</p>
                <ul className="space-y-2 text-sm text-intel-muted mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-intel-accent shrink-0" />
                    Full code on GitHub
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-intel-accent shrink-0" />
                    Docker Compose, Vercel, your infra
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-intel-accent shrink-0" />
                    No license cost
                  </li>
                </ul>
                <Button variant="outline" size="sm" asChild>
                  <a href={`${GITHUB_REPO_URL}#quick-start`} target="_blank" rel="noopener noreferrer">
                    Deployment guide
                  </a>
                </Button>
              </div>
              <div className="p-6 rounded-lg border border-intel-accent/40 bg-intel-accent/10">
                <p className="font-mono text-intel-accent font-semibold mb-2">Hosted</p>
                <p className="text-3xl font-bold mb-2">~€29/year</p>
                <ul className="space-y-2 text-sm text-intel-muted mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-intel-accent shrink-0" />
                    Managed instance
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-intel-accent shrink-0" />
                    Backups and updates
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-intel-accent shrink-0" />
                    No infra to manage
                  </li>
                </ul>
                <Button size="sm" asChild>
                  <Link href="/signup">Get started</Link>
                </Button>
              </div>
            </div>

            <p className="text-center text-xs text-intel-muted/80 mt-8">
              100% open source code. Nobody pays for closed functionality.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 sm:px-6 lg:px-8 py-16 max-w-6xl mx-auto border-t border-intel-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-sm text-intel-muted">
              Built by and for analysts. Contributions welcome.
            </p>
            <div className="flex items-center gap-6">
              <a
                href={`${GITHUB_REPO_URL}/blob/main/CONTRIBUTING.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-intel-accent hover:text-intel-text transition-colors"
              >
                Contribute
              </a>
              <a
                href={`${GITHUB_REPO_URL}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-intel-accent hover:text-intel-text transition-colors"
              >
                Issues
              </a>
              <a
                href={`${GITHUB_REPO_URL}/blob/main/LICENSE`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-intel-muted hover:text-intel-text transition-colors"
              >
                License
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
