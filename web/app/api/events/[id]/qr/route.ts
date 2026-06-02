import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { mintClaimTokens } from '@/lib/server/claims'
import { qrDataUrl } from '@/lib/qr'
import { buildStickerSheet } from '@/lib/pdf'

const TTL_MS = 30 * 60_000 // simple-mode 30 мин (Locked)
const MAX_COUNT = 200

// POST /api/events/[id]/qr?count=N&format=json|pdf
//   json (default): токены + QR PNG data-url.
//   pdf: лист стикеров A4 (application/pdf).
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/events/[id]/qr'>,
) {
  const { id } = await ctx.params
  const sp = new URL(request.url).searchParams
  const count = Math.min(Math.max(1, Number(sp.get('count') ?? '1')), MAX_COUNT)
  const format = sp.get('format') ?? 'json'

  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) {
    return NextResponse.json({ error: 'event not found' }, { status: 404 })
  }

  const minted = await mintClaimTokens(event.id, count, TTL_MS)
  const baseUrl = new URL(request.url).origin
  const urls = minted.map((m) => `${baseUrl}/claim/${m.token}`)

  if (format === 'pdf') {
    const pdf = await buildStickerSheet(event.name, urls)
    return new NextResponse(pdf as BodyInit, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${slug(event.name)}-stickers.pdf"`,
      },
    })
  }

  const tokens = await Promise.all(
    minted.map(async (m, i) => ({
      token: m.token,
      url: urls[i],
      qr: await qrDataUrl(urls[i]),
    })),
  )
  return NextResponse.json({ count: tokens.length, tokens })
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event'
}
