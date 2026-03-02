import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mhuofnkbjbanrdvvktps.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const rows = await fetch(
    `${SUPABASE_URL}/rest/v1/reports?lead_id=eq.${params.id}&select=overall_score,dimension_scores,leads(org_name)&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  ).then((r) => r.json())

  if (!rows || rows.length === 0 || rows.error) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const report = rows[0]
  const orgName: string = (report.leads as { org_name?: string } | null)?.org_name ?? 'Organization'
  const overall: number = report.overall_score ?? 0
  const dims: Record<string, number> = report.dimension_scores ?? {}

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const teal = [13, 92, 99] as const
  const accent = [78, 205, 196] as const

  // Header
  doc.setFillColor(...teal)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('CONNAI', 105, 14, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Digital Maturity Report', 105, 22, { align: 'center' })

  // Org name
  doc.setFontSize(16)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.text(orgName, 105, 46, { align: 'center' })

  // Overall score circle area
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('OVERALL SCORE', 105, 58, { align: 'center' })
  doc.setFontSize(52)
  doc.setTextColor(...accent)
  doc.setFont('helvetica', 'bold')
  doc.text(String(overall), 105, 80, { align: 'center' })
  doc.setFontSize(14)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('/ 100', 105, 90, { align: 'center' })

  // Divider
  doc.setDrawColor(30, 45, 61)
  doc.line(20, 98, 190, 98)

  // Dimension scores
  doc.setFontSize(12)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.text('Dimension Scores', 20, 110)

  const sorted = Object.entries(dims).sort((a, b) => b[1] - a[1])
  let y = 122
  for (const [name, score] of sorted) {
    const label = name.charAt(0).toUpperCase() + name.slice(1)
    const barWidth = Math.round((score / 100) * 120)

    doc.setFillColor(20, 30, 40)
    doc.rect(20, y - 5, 120, 8, 'F')
    doc.setFillColor(...accent)
    doc.rect(20, y - 5, barWidth, 8, 'F')

    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    doc.text(label, 148, y + 1)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...accent)
    doc.text(String(score), 185, y + 1, { align: 'right' })
    y += 16
  }

  // Footer
  doc.setFillColor(8, 12, 16)
  doc.rect(0, 272, 210, 25, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Built by Linkgrow · connai.linkgrow.io', 105, 284, { align: 'center' })

  const buffer = Buffer.from(doc.output('arraybuffer'))

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="connai-report-${params.id}.pdf"`,
    },
  })
}
