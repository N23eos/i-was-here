import { NextResponse, type NextRequest } from 'next/server'
import { isAddress } from 'viem'
import { prisma } from '@/lib/db'
import { mintClaimTokens } from '@/lib/server/claims'
import { publicClient } from '@/lib/server/clients'
import { attendanceNftAbi, attendanceNftAddress } from '@/lib/contract'

const TTL_MS = 10 * 60_000

// POST /api/events/[id]/claim-shared — режим «один QR для всех».
// Один статичный QR ведёт сюда; на каждый кошелёк выдаём свежую одноразовую подпись.
// Лимит 1 бейдж на кошелёк: проверяем on-chain balanceOf (authoritative).
// body: { recipient }
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/events/[id]/claim-shared'>,
) {
  const { id } = await ctx.params
  let body: { recipient?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  const recipient = body.recipient
  if (!recipient || !isAddress(recipient)) {
    return NextResponse.json({ error: 'valid recipient required' }, { status: 400 })
  }

  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) {
    return NextResponse.json({ error: 'event not found' }, { status: 404 })
  }

  // Лимит 1 на кошелёк: уже есть бейдж этого события?
  const balance = (await publicClient.readContract({
    address: attendanceNftAddress,
    abi: attendanceNftAbi,
    functionName: 'balanceOf',
    args: [recipient, event.onchainEventId],
  })) as bigint
  if (balance > BigInt(0)) {
    return NextResponse.json(
      { error: 'This wallet already claimed a badge for this event.' },
      { status: 409 },
    )
  }

  // Свежий одноразовый токен для этого кошелька.
  const [minted] = await mintClaimTokens(event.id, 1, TTL_MS)
  return NextResponse.json({
    eventId: event.onchainEventId.toString(),
    claimUUID: minted.claimUUID,
    token: minted.token,
    contractAddress: attendanceNftAddress,
    eventName: event.name,
  })
}
