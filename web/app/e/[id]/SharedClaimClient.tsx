'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { WalletButton } from '@/components/WalletButton'

export function SharedClaimClient({ id }: { id: string }) {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function claim() {
    if (!address) return
    setBusy(true)
    setError(null)
    try {
      const r = await fetch(`/api/events/${id}/claim-shared`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipient: address }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
      // переиспользуем обычную claim-страницу (подпись + транзакция)
      router.push(`/claim/${data.token}`)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 p-8 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Claim your badge
        </h1>
        <p className="mt-1 text-gray-500">Proof of attendance on Base.</p>
      </div>

      {!isConnected ? (
        <WalletButton />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={claim}
            disabled={busy}
            className="rounded-xl bg-[#0052FF] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0042cc] disabled:opacity-50"
          >
            {busy ? 'Preparing…' : 'Claim badge'}
          </button>
          {error && <p className="max-w-xs text-center text-sm text-red-600">{error}</p>}
        </div>
      )}
    </main>
  )
}
