import { NextResponse, type NextRequest } from 'next/server'
import { randomBytes } from 'node:crypto'
import { toHex } from 'viem'
import { prisma } from '@/lib/db'
import { decryptKey } from '@/lib/crypto'
import { signClaim } from '@/lib/signing'

const TTL_MIN = 30 // simple-mode TTL (Locked)
const MAX_COUNT = 200

// POST /api/events/[id]/qr?count=N — сгенерить N claim-токенов (simple mode).
// Каждый токен: одноразовый claimUUID + подпись signer-ключа события.
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/events/[id]/qr'>,
) {
  const { id } = await ctx.params
  const count = Math.min(
    Math.max(1, Number(new URL(request.url).searchParams.get('count') ?? '1')),
    MAX_COUNT,
  )

  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) {
    return NextResponse.json({ error: 'event not found' }, { status: 404 })
  }

  const privateKey = decryptKey(event.encryptedSignerKey) as `0x${string}`
  const expiresAt = new Date(Date.now() + TTL_MIN * 60_000)
  const baseUrl = new URL(request.url).origin

  const tokens: { token: string; url: string }[] = []
  for (let i = 0; i < count; i++) {
    const claimUUID = toHex(randomBytes(32))
    const signature = await signClaim(claimUUID, event.onchainEventId, privateKey)

    const ct = await prisma.claimToken.create({
      data: { eventId: event.id, claimUUID, signature, expiresAt },
    })
    tokens.push({ token: ct.id, url: `${baseUrl}/claim/${ct.id}` })
  }

  return NextResponse.json({ count: tokens.length, expiresAt, tokens })
}
