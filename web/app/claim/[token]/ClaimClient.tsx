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
      <h1 className="text-2xl font-bold">{claim.eventName}</h1>
      <p className="text-gray-500">Claim your proof-of-attendance badge.</p>

      {!isConnected ? (
        <div className="flex flex-col items-center gap-2">
          <WalletButton />
          <p className="mt-1 max-w-xs text-center text-xs text-gray-400">
            On Base Sepolia testnet. If a wallet says &quot;network not
            supported&quot;, use MetaMask or Rabby.
          </p>
        </div>
      ) : isConfirmed ? (
        <div className="space-y-2 text-center">
          <p className="text-green-600 font-semibold">✓ Badge claimed!</p>
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline text-sm"
          >
            View transaction
          </a>
        </div>
      ) : (
        <div className="space-y-3 text-center">
          {chainId !== baseSepolia.id && (
            <p className="text-amber-600 text-sm">
              Wrong network — claiming will switch you to Base Sepolia.
            </p>
          )}
          <button
            onClick={handleClaim}
            disabled={isPending || isConfirming}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
            <p className="text-red-600 text-sm">
              {writeError.message.includes('ClaimUsed')
                ? 'This claim was already used.'
                : writeError.message.slice(0, 140)}
            </p>
          )}
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 gap-6">
      {children}
    </main>
  )
}
