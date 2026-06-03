'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
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
  const [testQr, setTestQr] = useState<{ url: string; qr: string } | null>(null)

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

  // Для simple — сразу показать тестовый QR (без лишних кликов).
  useEffect(() => {
    if (stats?.mode === 'simple' && !testQr) makeTestLink()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats?.mode])

  // Для secure (один QR для всех) — статичный QR на /e/[id].
  const [sharedQr, setSharedQr] = useState<{ url: string; qr: string } | null>(null)
  useEffect(() => {
    if (stats?.mode !== 'secure') return
    const url = `${window.location.origin}/e/${id}`
    QRCode.toDataURL(url, { margin: 1, width: 512 }).then((qr) =>
      setSharedQr({ url, qr }),
    )
  }, [stats?.mode, id])

  async function makeTestLink() {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch(`/api/events/${id}/qr?count=1&format=json`, {
        method: 'POST',
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
      setTestQr({ url: data.tokens[0].url, qr: data.tokens[0].qr })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

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
          <Card className="flex flex-col items-center gap-4 text-center">
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">
                One shared QR for everyone
              </div>
              <div className="text-sm text-gray-500">
                Show this on a screen. Each wallet can claim once.
              </div>
            </div>
            {sharedQr ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sharedQr.qr}
                  alt="Shared QR"
                  width={260}
                  height={260}
                  className="rounded-xl border border-gray-100 dark:border-gray-800"
                />
                <a
                  href={sharedQr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-xl bg-[#0052FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0042cc]"
                >
                  Open claim page →
                </a>
                <p className="max-w-sm break-all text-xs text-gray-400">
                  {sharedQr.url}
                </p>
              </>
            ) : (
              <div className="flex h-64 w-64 items-center justify-center text-gray-400">
                Generating QR…
              </div>
            )}
          </Card>
        ) : (
          <>
            {/* QR — главный элемент: показываем сразу, можно кликнуть/сканировать */}
            <Card className="flex flex-col items-center gap-4 text-center">
              <div className="font-semibold text-gray-900 dark:text-white">
                Claim QR
              </div>
              {testQr ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={testQr.qr}
                    alt="Claim QR"
                    width={220}
                    height={220}
                    className="rounded-xl border border-gray-100 dark:border-gray-800"
                  />
                  <a
                    href={testQr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-xl bg-[#0052FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0042cc]"
                  >
                    Open claim page →
                  </a>
                  <p className="max-w-sm text-xs text-gray-400">
                    Click to claim in this browser, or scan with a phone on the
                    same WiFi. Each QR is single-use.
                  </p>
                  <Button variant="ghost" onClick={makeTestLink} disabled={busy}>
                    {busy ? 'Refreshing…' : '↻ New QR'}
                  </Button>
                </>
              ) : (
                <div className="flex h-56 w-56 items-center justify-center text-gray-400">
                  {busy ? 'Generating QR…' : 'Loading…'}
                </div>
              )}
            </Card>

            {/* Печать пачкой */}
            <Card>
              <div className="mb-3 font-semibold text-gray-900 dark:text-white">
                Print sticker sheet
              </div>
              <div className="flex items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-gray-500">
                    How many
                  </span>
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
          </>
        )}
      </div>
    </PageShell>
  )
}
