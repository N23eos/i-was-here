'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PageShell, Card, Button, Badge } from '@/components/ui'

type Stats = {
  name: string
  mode: 'simple' | 'secure'
  minted: number
  maxSupply: number
  soldOut: boolean
  claimedInDb: number
  tokensIssued: number
}

export function EventDetail({ id }: { id: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [count, setCount] = useState('10')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch(`/api/events/${id}/stats`)
    if (r.ok) setStats(await r.json())
  }, [id])

  // Live-счётчик: polling каждые 5с.
  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])

  async function downloadPdf() {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch(
        `/api/events/${id}/qr?count=${Number(count)}&format=pdf`,
        { method: 'POST' },
      )
      if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`)
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'stickers.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell
      title={stats?.name ?? 'Event'}
      subtitle="Event dashboard"
      action={
        <Link href="/organizer">
          <Button variant="secondary">← All events</Button>
        </Link>
      }
    >
      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Claimed</div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                {stats ? stats.minted : '—'}
                <span className="text-2xl text-gray-400">
                  {' '}
                  / {stats?.maxSupply ?? '—'}
                </span>
              </div>
            </div>
            <div className="text-right">
              {stats && <Badge>{stats.mode}</Badge>}
              {stats?.soldOut && (
                <div className="mt-2 text-sm font-semibold text-red-600">
                  Sold out
                </div>
              )}
            </div>
          </div>
          {stats && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full bg-[#0052FF] transition-all"
                style={{
                  width: `${Math.min(100, (stats.minted / stats.maxSupply) * 100)}%`,
                }}
              />
            </div>
          )}
        </Card>

        {stats?.mode === 'secure' ? (
          <Card className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">
                Live entry screen
              </div>
              <div className="text-sm text-gray-500">
                Rotating QR that refreshes every ~15s.
              </div>
            </div>
            <Link href={`/organizer/${id}/live`}>
              <Button>Open live screen</Button>
            </Link>
          </Card>
        ) : (
          <Card>
            <div className="mb-3 font-semibold text-gray-900 dark:text-white">
              Print QR stickers
            </div>
            <div className="flex items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-sm text-gray-500">How many</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="w-28 rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </label>
              <Button onClick={downloadPdf} disabled={busy}>
                {busy ? 'Generating…' : 'Download PDF'}
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </Card>
        )}
      </div>
    </PageShell>
  )
}
