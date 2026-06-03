'use client'

import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

// Единый выбор кошелька: MetaMask / Rabby (EIP-6963) + Base Account (email).
export function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [open, setOpen] = useState(false)

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Disconnect
        </button>
      </div>
    )
  }

  // дедуп по имени (EIP-6963 может дать дубли)
  const seen = new Set<string>()
  const list = connectors.filter((c) => {
    if (seen.has(c.name)) return false
    seen.add(c.name)
    return true
  })

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-[#0052FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0042cc]"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="flex w-64 flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900">
      <div className="px-1 pb-1 text-xs font-medium text-gray-400">
        Choose a wallet
      </div>
      {list.map((c) => (
        <button
          key={c.uid}
          disabled={isPending}
          onClick={() => {
            connect({ connector: c })
            setOpen(false)
          }}
          className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-left text-sm font-semibold hover:border-[#0052FF] hover:bg-[#0052FF]/5 disabled:opacity-50 dark:border-gray-700"
        >
          {c.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.icon} alt="" width={20} height={20} className="rounded" />
          )}
          {c.name}
        </button>
      ))}
      <button
        onClick={() => setOpen(false)}
        className="px-1 pt-1 text-xs text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
    </div>
  )
}
