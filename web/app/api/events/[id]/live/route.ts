import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { mintClaimTokens } from '@/lib/server/claims'
import { qrDataUrl } from '@/lib/qr'

const LIVE_TTL_MS = 30_000 // secure: ротация ~15с, TTL ~30с (старый скрин протухает)

// POST /api/events/[id]/live — secure: новый одноразовый token с коротким TTL.
// Фронт-экран опрашивает каждые ~15с → старый QR бесполезен для репоста.
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/events/[id]/live'>,
) {
  const { id } = await ctx.params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) {
    return NextResponse.json({ error: 'event not found' }, { status: 404 })
  }

  const [minted] = await mintClaimTokens(event.id, 1, LIVE_TTL_MS)
  const url = `${new URL(request.url).origin}/claim/${minted.token}`
  const qr = await qrDataUrl(url)

  return NextResponse.json({ token: minted.token, url, qr, ttlMs: LIVE_TTL_MS })
}
