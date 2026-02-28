/**
 * Export briefing content to Markdown or PDF
 */

import { jsPDF } from 'jspdf'

export interface BriefingItemExport {
  title: string
  fact: string
  citations: { source: string; url: string }[]
  why_it_matters: string
  signals_72h: string[]
  confidence: number
  topics: string[]
  countries: string[]
}

export function exportBriefingToMarkdown(
  items: BriefingItemExport[],
  date: string,
  dateFormatted: string
): string {
  const lines: string[] = [
    `# IntelDesk Daily Briefing`,
    ``,
    `**${dateFormatted}**`,
    ``,
    `---`,
    ``,
  ]

  items.forEach((item, i) => {
    lines.push(`## ${i + 1}. ${item.title}`)
    lines.push(``)
    lines.push(`*Confidence: ${item.confidence}%*`)
    if (item.countries.length) {
      lines.push(`*Countries: ${item.countries.join(', ')}*`)
    }
    if (item.topics.length) {
      lines.push(`*Topics: ${item.topics.join(', ')}*`)
    }
    lines.push(``)
    lines.push(`### Fact`)
    lines.push(item.fact)
    lines.push(``)
    lines.push(`### Why it matters`)
    lines.push(item.why_it_matters)
    if (item.signals_72h?.length) {
      lines.push(``)
      lines.push(`### Signals (72h)`)
      item.signals_72h.forEach((s) => lines.push(`- ${s}`))
    }
    if (item.citations?.length) {
      lines.push(``)
      lines.push(`### Sources`)
      item.citations.forEach((c) => lines.push(`- [${c.source}](${c.url})`))
    }
    lines.push(``)
    lines.push(`---`)
    lines.push(``)
  })

  return lines.join('\n')
}

function wrapText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * 7
}

export function exportBriefingToPdf(
  items: BriefingItemExport[],
  date: string,
  dateFormatted: string
): Blob {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const maxWidth = pageWidth - 2 * margin
  let y = margin

  // Header
  doc.setFontSize(18)
  doc.text('IntelDesk Daily Briefing', margin, y)
  y += 10

  doc.setFontSize(10)
  doc.text(dateFormatted, margin, y)
  y += 12

  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  items.forEach((item, i) => {
    if (y > 270) {
      doc.addPage()
      y = margin
    }

    doc.setFontSize(12)
    doc.text(`${i + 1}. ${item.title}`, margin, y)
    y += 8

    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    const meta = [
      `Confidence: ${item.confidence}%`,
      item.countries.length ? `Countries: ${item.countries.join(', ')}` : null,
      item.topics.length ? `Topics: ${item.topics.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' | ')
    doc.text(meta, margin, y)
    y += 6
    doc.setTextColor(0, 0, 0)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Fact', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    y = wrapText(doc, item.fact, margin, y, maxWidth) + 4

    doc.setFont('helvetica', 'bold')
    doc.text('Why it matters', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    y = wrapText(doc, item.why_it_matters, margin, y, maxWidth) + 4

    if (item.signals_72h?.length) {
      doc.setFont('helvetica', 'bold')
      doc.text('Signals (72h)', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      item.signals_72h.forEach((s) => {
        y = wrapText(doc, `• ${s}`, margin, y, maxWidth) + 2
      })
      y += 2
    }

    y += 6
  })

  return doc.output('blob')
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
