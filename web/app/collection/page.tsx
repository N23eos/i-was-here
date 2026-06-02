'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect, useReadContracts } from 'wagmi'
import { attendanceNftAbi, attendanceNftAddress } from '@/lib/contract'
import { calcLevel } from '@/lib/level'
import { PageShell, Card, Button } from '@/components/ui'

type EventRow = { id: string; name: string; onchainEventId: string }

export default function CollectionPage() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const [events, setEvents] = useState<EventRow[]>([])

  useEffect(() => {
    fetch('/api/events')
      .then((r) => (r.ok ? r.json() : []))
      .then(setEvents)
      .catch(() => {})
  }, [])

  // balanceOf для каждого события (batch).
  const { data: balances } = useReadContracts({
    contracts: events.map((e) => ({
      address: attendanceNftAddress,
      abi: attendanceNftAbi,
      functionName: 'balanceOf' as const,
      args: [address as `0x${string}`, BigInt(e.onchainEventId)],
    })),
    query: { enabled: isConnected && events.length > 0 },
  })

  const owned = events.filter((_, i) => {
    const b = balances?.[i]?.result as bigint | undefined
    return b !== undefined && b > BigInt(0)
  })
  const level = calcLevel(owned.length)

  if (!isConnected) {
    return (
      <PageShell title="My collection" subtitle="Your attendance badges">
        <Card className="flex flex-col items-start gap-4">
          <p className="text-gray-500">Connect your wallet to see your badges.</p>
          <Button
            onClick={() => {
              const c =
                connectors.find((x) => x.id === 'baseAccount') ?? connectors[0]
              connect({ connector: c })
            }}
          >
            Connect Wallet
          </Button>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell title="My collection" subtitle="Your attendance badges">
      <div className="space-y-6">
        <Card className="flex items-center justify-between bg-gradient-to-br from-[#0052FF] to-[#003bbf] text-white">
          <div>
            <div className="text-sm opacity-80">Your level</div>
            <div className="text-3xl font-bold">{level.name}</div>
            <div className="mt-1 text-sm opacity-80">
              {level.badges} badge{level.badges === 1 ? '' : 's'}
              {level.next !== null && ` · ${level.next} to next level`}
            </div>
          </div>
          <div className="text-5xl font-black opacity-30">L{level.level}</div>
        </Card>

        {owned.length === 0 ? (
          <Card>
            <p className="text-gray-500">
              No badges yet. Scan an event QR to claim your first one.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {owned.map((e) => (
              <Card key={e.id} className="flex flex-col items-center gap-3 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/badge-placeholder.svg"
                  alt={e.name}
                  width={96}
                  height={96}
                  className="rounded-xl"
                />
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {e.name}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
