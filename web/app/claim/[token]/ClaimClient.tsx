'use client'

import { useEffect, useState } from 'react'
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { attendanceNftAbi } from '@/lib/contract'
import { WalletButton } from '@/components/WalletButton'

type ClaimData = {
  eventId: string
  claimUUID: `0x${string}`
  signature: `0x${string}`
  contractAddress: `0x${string}`
  eventName: string
}

export function ClaimClient({ token }: { token: string }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { writeContract, data: txHash, isPending, error: writeError } =
    useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  const [claim, setClaim] = useState<ClaimData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Загрузка claim-данных по токену.
  useEffect(() => {
    fetch(`/api/claim?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
        setClaim(data)
      })
      .catch((e) => setLoadError(e.message))
  }, [token])

  // После подтверждения on-chain — пометить токен использованным (UX).
  useEffect(() => {
    if (isConfirmed && txHash && address) {
      fetch('/api/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, recipient: address, txHash }),
      }).catch(() => {})
    }
  }, [isConfirmed, txHash, address, token])

  function handleClaim() {
    if (!claim || !address) return
    if (chainId !== baseSepolia.id) {
      switchChain({ chainId: baseSepolia.id })
      return
    }
    writeContract({
      address: claim.contractAddress,
      abi: attendanceNftAbi,
      functionName: 'claim',
      args: [BigInt(claim.eventId), claim.claimUUID, address, claim.signature],
    })
  }

  if (loadError) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Claim unavailable</h1>
        <p className="text-red-600">{loadError}</p>
      </Shell>
    )
  }

  if (!claim) {
    return (
      <Shell>
        <p className="text-gray-500">Loading claim…</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl dark:border-gray-800 dark:bg-gray-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/badge-placeholder.svg"
          alt={claim.eventName}
          width={120}
          height={120}
          className={`mx-auto rounded-2xl transition ${
            isConfirmed ? '' : 'opacity-90'
          }`}
        />
        <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
          {claim.eventName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Proof-of-attendance badge
        </p>

        <div className="mt-6">
          {!isConnected ? (
            <div className="flex flex-col items-center gap-2">
              <WalletButton />
              <p className="mt-1 text-xs text-gray-400">
                On Base Sepolia. Use MetaMask or Rabby if a wallet says
                &quot;network not supported&quot;.
              </p>
            </div>
          ) : isConfirmed ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-green-50 px-4 py-3 font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                ✓ Badge claimed!
              </div>
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#0052FF] underline"
              >
                View transaction
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {chainId !== baseSepolia.id && (
                <p className="text-sm text-amber-600">
                  Wrong network — claiming switches you to Base Sepolia.
                </p>
              )}
              <button
                onClick={handleClaim}
                disabled={isPending || isConfirming}
                className="w-full rounded-xl bg-[#0052FF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0042cc] disabled:opacity-50"
              >
                {isPending
                  ? 'Confirm in wallet…'
                  : isConfirming
                    ? 'Minting…'
                    : chainId !== baseSepolia.id
                      ? 'Switch network'
                      : 'Claim badge'}
              </button>
              {writeError && (
                <p className="text-sm text-red-600">
                  {writeError.message.includes('ClaimUsed')
                    ? 'This claim was already used.'
                    : writeError.message.slice(0, 140)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 dark:bg-gray-950">
      {children}
    </main>
  )
}
