'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useConnect } from 'wagmi'
import { useIsOwner } from './useIsOwner'
import { PageShell, Card, Button, Field, Badge } from '@/components/ui'

type EventRow = {
  id: string
  name: string
  mode: 'simple' | 'secure'
  onchainEventId: string
  maxSupply: number
}

export default function OrganizerPage() {
  const { isOwner, isConnected, isLoading } = useIsOwner()
  const { connect, connectors } = useConnect()

  if (!isConnected) {
    return (
      <Gate>
        <p className="text-gray-500">Connect the owner wallet to manage events.</p>
        <Button
          onClick={() => {
            const c =
              connectors.find((x) => x.id === 'baseAccount') ?? connectors[0]
            connect({ connector: c })
          }}
        >
          Connect Wallet
        </Button>
      </Gate>
    )
  }

  if (isLoading) {
    return (
      <Gate>
        <p className="text-gray-500">Checking access…</p>
      </Gate>
    )
  }

  if (!isOwner) {
    return (
      <Gate>
        <p className="text-red-600">
          This wallet is not the contract owner. Switch to the owner wallet.
        </p>
      </Gate>
    )
  }

  return <Dashboard />
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <PageShell title="Organizer" subtitle="Create and manage attendance events">
      <Card className="flex flex-col items-start gap-4">{children}</Card>
    </PageShell>
  )
}

function Dashboard() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(false)

  async function refresh() {
    const r = await fetch('/api/events')
    if (r.ok) setEvents(await r.json())
  }
  useEffect(() => {
    refresh()
  }, [])

  return (
    <PageShell
      title="Organizer"
      subtitle="Create and manage attendance events"
      action={
        <Link href="/collection">
          <Button variant="secondary">My collection</Button>
        </Link>
      }
    >
      <div className="space-y-6">
        <CreateForm onCreated={refresh} loading={loading} setLoading={setLoading} />

        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Events
          </h2>
          {events.length === 0 ? (
            <Card>
              <p className="text-gray-500">No events yet. Create your first one.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {events.map((e) => (
                <Link key={e.id} href={`/organizer/${e.id}`}>
                  <Card className="flex items-center justify-between transition hover:border-[#0052FF]">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {e.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        max {e.maxSupply} · #{e.onchainEventId.slice(0, 8)}…
                      </div>
                    </div>
                    <Badge>{e.mode}</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}

function CreateForm({
  onCreated,
  loading,
  setLoading,
}: {
  onCreated: () => void
  loading: boolean
  setLoading: (v: boolean) => void
}) {
  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [maxSupply, setMaxSupply] = useState('100')
  const [mode, setMode] = useState<'simple' | 'secure'>('simple')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const r = await fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          mode,
          startTime: Math.floor(new Date(start).getTime() / 1000),
          endTime: Math.floor(new Date(end).getTime() / 1000),
          maxSupply: Number(maxSupply),
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
      setName('')
      setStart('')
      setEnd('')
      onCreated()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        New event
      </h2>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Event name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ETH Berlin 2026"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Starts"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
          <Field
            label="Ends"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Max badges"
            type="number"
            min={1}
            value={maxSupply}
            onChange={(e) => setMaxSupply(e.target.value)}
            required
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mode
            </span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'simple' | 'secure')}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0052FF] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="simple">Simple — printed QR stickers</option>
              <option value="secure">Secure — live rotating QR</option>
            </select>
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating on-chain…' : 'Create event'}
        </Button>
      </form>
    </Card>
  )
}
