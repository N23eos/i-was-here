import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { attendanceNftAddress } from '@/lib/contract'

// GET /api/claim?token=... — данные для on-chain claim().
// Priv-key НЕ отдаём, только подпись (она и так одноразовая).
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 })
  }

  const ct = await prisma.claimToken.findUnique({
    where: { id: token },
    include: { event: true },
  })
  if (!ct) {
    return NextResponse.json({ error: 'token not found' }, { status: 404 })
  }
  if (ct.used) {
    return NextResponse.json({ error: 'token already used' }, { status: 409 })
  }
  if (ct.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'token expired' }, { status: 410 })
  }

  return NextResponse.json({
    eventId: ct.event.onchainEventId.toString(),
    claimUUID: ct.claimUUID,
    signature: ct.signature,
    contractAddress: attendanceNftAddress,
    eventName: ct.event.name,
  })
}

// POST /api/claim — пометить токен использованным (UX-only, после успешного mint).
// body: { token, recipient, txHash }
export async function POST(request: NextRequest) {
  let body: { token?: string; recipient?: string; txHash?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  const { token, recipient, txHash } = body
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 })
  }

  await prisma.claimToken.update({
    where: { id: token },
    data: { used: true, recipient, txHash },
  })
  return NextResponse.json({ ok: true })
}
