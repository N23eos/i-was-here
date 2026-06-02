import { NextResponse, type NextRequest } from 'next/server'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db'
import { encryptKey, genSigner } from '@/lib/crypto'
import { buildMetadataUri } from '@/lib/metadata'
import { publicClient, getDeployerWalletClient } from '@/lib/server/clients'
import { attendanceNftAbi, attendanceNftAddress } from '@/lib/contract'

// POST /api/events — создать событие (организатор).
// MVP: без auth (testnet). Sprint 04 добавит. deployer key — server-only.
// body: { name, mode?, startTime, endTime, maxSupply }
//   startTime/endTime — ISO-строки или unix-секунды.
export async function POST(request: NextRequest) {
  let body: {
    name?: string
    mode?: 'simple' | 'secure'
    startTime?: string | number
    endTime?: string | number
    maxSupply?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const { name, mode = 'simple', startTime, endTime, maxSupply } = body
  if (!name || startTime == null || endTime == null || !maxSupply) {
    return NextResponse.json(
      { error: 'name, startTime, endTime, maxSupply required' },
      { status: 400 },
    )
  }

  const start = toUnix(startTime)
  const end = toUnix(endTime)
  if (start >= end) {
    return NextResponse.json({ error: 'startTime must be < endTime' }, { status: 400 })
  }
  if (maxSupply <= 0) {
    return NextResponse.json({ error: 'maxSupply must be > 0' }, { status: 400 })
  }

  // Уникальный eventId (uint256 в контракте). random uint64 → коллизии практически нет;
  // всё равно проверяем в БД.
  const onchainEventId = await uniqueEventId()

  // Keypair-подписант события: priv шифруем, on-chain идёт только address.
  const signer = genSigner()
  const encryptedSignerKey = encryptKey(signer.privateKey)

  const baseUrl = new URL(request.url).origin
  const metadataUri = buildMetadataUri(name, baseUrl)

  // on-chain createEvent (owner = deployer), ждём receipt.
  let txHash: `0x${string}`
  try {
    const wallet = getDeployerWalletClient()
    txHash = await wallet.writeContract({
      address: attendanceNftAddress,
      abi: attendanceNftAbi,
      functionName: 'createEvent',
      args: [
        onchainEventId,
        signer.address,
        BigInt(start),
        BigInt(end),
        maxSupply,
        metadataUri,
      ],
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'createEvent tx reverted', txHash }, { status: 502 })
    }
  } catch (e) {
    return NextResponse.json(
      { error: 'on-chain createEvent failed', detail: String(e) },
      { status: 502 },
    )
  }

  // Запись в БД после успешного on-chain.
  const event = await prisma.event.create({
    data: {
      onchainEventId,
      name,
      mode,
      signerAddress: signer.address,
      encryptedSignerKey,
      startTime: new Date(start * 1000),
      endTime: new Date(end * 1000),
      maxSupply,
      metadataUri,
    },
  })

  return NextResponse.json({
    id: event.id,
    onchainEventId: onchainEventId.toString(),
    signerAddress: signer.address,
    txHash,
  })
}

function toUnix(v: string | number): number {
  if (typeof v === 'number') return Math.floor(v)
  // ISO-строка или числовая строка
  const n = Number(v)
  if (!Number.isNaN(n) && /^\d+$/.test(v.trim())) return Math.floor(n)
  return Math.floor(new Date(v).getTime() / 1000)
}

async function uniqueEventId(): Promise<bigint> {
  for (let i = 0; i < 5; i++) {
    const id = BigInt('0x' + randomBytes(8).toString('hex'))
    const exists = await prisma.event.findUnique({ where: { onchainEventId: id } })
    if (!exists) return id
  }
  throw new Error('could not generate unique eventId')
}
