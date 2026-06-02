'use client'

import { useEffect, useState } from 'react'

const REFRESH_MS = 15_000 // ротация QR (TTL токена 30с)

// SECURE live-экран входа: большой QR, авто-обновление каждые ~15с.
// Старый скрин протухает за 30с → репост бесполезен.
export function LiveScreen({ id }: { id: string }) {
  const [qr, setQr] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    async function rotate() {
      try {
        const r = await fetch(`/api/events/${id}/live`, { method: 'POST' })
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
        if (active) {
          setQr(data.qr)
          setError(null)
        }
      } catch (e) {
        if (active) setError((e as Error).message)
      }
    }
    rotate()
    const t = setInterval(() => {
      rotate()
      setTick((n) => n + 1)
    }, REFRESH_MS)
    return () => {
      active = false
      clearInterval(t)
    }
  }, [id])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0052FF] p-8">
      <h1 className="text-3xl font-bold text-white">Scan to claim your badge</h1>
      <div className="rounded-3xl bg-white p-6 shadow-2xl">
        {error ? (
          <p className="w-72 text-center text-red-600">{error}</p>
        ) : qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Claim QR" width={320} height={320} />
        ) : (
          <div className="flex h-80 w-80 items-center justify-center text-gray-400">
            Loading…
          </div>
        )}
      </div>
      <p className="text-sm text-white/70">
        Code refreshes every 15s · screenshot #{tick}
      </p>
    </main>
  )
}
