import { randomBytes } from 'node:crypto'
import { toHex } from 'viem'
import { prisma } from '@/lib/db'
import { decryptKey } from '@/lib/crypto'
import { signClaim } from '@/lib/signing'

// Генерация подписанных claim-токенов для события (общее для simple-QR и secure-live).
// ttlMs: simple = 30мин, secure-live = ~30с.
export async function mintClaimTokens(
  eventDbId: string,
  count: number,
  ttlMs: number,
): Promise<{ token: string; claimUUID: `0x${string}` }[]> {
  const event = await prisma.event.findUnique({ where: { id: eventDbId } })
  if (!event) throw new Error('event not found')

  const privateKey = decryptKey(event.encryptedSignerKey) as `0x${string}`
  const expiresAt = new Date(Date.now() + ttlMs)

  const out: { token: string; claimUUID: `0x${string}` }[] = []
  for (let i = 0; i < count; i++) {
    const claimUUID = toHex(randomBytes(32))
    const signature = await signClaim(claimUUID, event.onchainEventId, privateKey)
    const ct = await prisma.claimToken.create({
      data: { eventId: event.id, claimUUID, signature, expiresAt },
    })
    out.push({ token: ct.id, claimUUID })
  }
  return out
}
