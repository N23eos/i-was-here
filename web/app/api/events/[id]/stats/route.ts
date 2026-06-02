import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { publicClient } from '@/lib/server/clients'
import { attendanceNftAbi, attendanceNftAddress } from '@/lib/contract'

// GET /api/events/[id]/stats — minted/maxSupply (on-chain) + клеймы (БД).
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/events/[id]/stats'>,
) {
  const { id } = await ctx.params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) {
    return NextResponse.json({ error: 'event not found' }, { status: 404 })
  }

  // events(eventId) → (signerAddress, startTime, endTime, maxSupply, minted, uri)
  const info = await publicClient.readContract({
    address: attendanceNftAddress,
    abi: attendanceNftAbi,
    functionName: 'events',
    args: [event.onchainEventId],
  })
  const maxSupply = Number(info[3])
  const minted = Number(info[4])

  const claimedInDb = await prisma.claimToken.count({
    where: { eventId: event.id, used: true },
  })
  const tokensIssued = await prisma.claimToken.count({
    where: { eventId: event.id },
  })

  return NextResponse.json({
    name: event.name,
    mode: event.mode,
    minted,
    maxSupply,
    soldOut: minted >= maxSupply,
    claimedInDb,
    tokensIssued,
  })
}
