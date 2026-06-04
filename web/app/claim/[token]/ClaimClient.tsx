'use client'

import { useEffect, useState } from 'react'
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useCapabilities,
  useSendCalls,
  useWaitForCallsStatus,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { encodeFunctionData } from 'viem'
import { activeChain, explorerTxUrl } from '@/lib/chain'
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

  const { data: capabilities } = useCapabilities({ account: address })
  // EIP-5792 sendCalls supported if wallet returns capabilities for this chain.
  const sendCallsSupported = Boolean(capabilities?.[activeChain.id])
  const paymasterSupported = Boolean(
    capabilities?.[activeChain.id]?.paymasterService?.supported
  )

  // EIP-5792 path (gasless-capable wallets).
  const {
    sendCalls,
    data: callsData,
    isPending: isSendPending,
    error: sendCallsError,
  } = useSendCalls()
  const { data: callsStatus, isSuccess: isCallsConfirmed } = useWaitForCallsStatus({
    id: callsData?.id as string,
    query: { enabled: Boolean(callsData?.id) },
  })

  // Fallback: regular writeContract (MetaMask, Rabby, wallets without EIP-5792).
  const {
    writeContract,
    data: writeTxHash,
    isPending: isWritePending,
    error: writeContractError,
  } = useWriteContract()
  const { isSuccess: isWriteConfirmed, isLoading: isWriteConfirming } =
    useWaitForTransactionReceipt({
      hash: writeTxHash,
      query: { enabled: Boolean(writeTxHash) },
    })

  // Merged state from both paths.
  const isPending = isSendPending || isWritePending
  const isConfirmed = isCallsConfirmed || isWriteConfirmed
  const isConfirming =
    (Boolean(callsData?.id) && !isCallsConfirmed) || isWriteConfirming
  const txHash =
    (callsStatus?.receipts?.[0]?.transactionHash as `0x${string}` | undefined) ??
    writeTxHash
  const txError = sendCallsError ?? writeContractError

  const [claim, setClaim] = useState<ClaimData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/claim?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
        setClaim(data)
      })
      .catch((e) => setLoadError(e.message))
  }, [token])

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
    if (chainId !== activeChain.id) {
      switchChain({ chainId: activeChain.id })
      return
    }

    if (sendCallsSupported) {
      const rawUrl = process.env.NEXT_PUBLIC_PAYMASTER_PROXY_URL ?? '/api/paymaster'
      const paymasterUrl = new URL(rawUrl, window.location.origin).toString()
      const canUsePaymaster = paymasterSupported && paymasterUrl.startsWith('https')
      sendCalls({
        calls: [
          {
            to: claim.contractAddress,
            data: encodeFunctionData({
              abi: attendanceNftAbi,
              functionName: 'claim',
              args: [BigInt(claim.eventId), claim.claimUUID, address, claim.signature],
            }),
          },
        ],
        ...(canUsePaymaster && {
          capabilities: { paymasterService: { url: paymasterUrl } },
        }),
      })
    } else {
      writeContract({
        address: claim.contractAddress,
        abi: attendanceNftAbi,
        functionName: 'claim',
        args: [BigInt(claim.eventId), claim.claimUUID, address, claim.signature],
      })
    }
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
        <p className="mt-1 text-sm text-gray-500">Proof-of-attendance badge</p>

        <div className="mt-6">
          {!isConnected ? (
            <div className="flex flex-col items-center gap-2">
              <WalletButton />
              <p className="mt-1 text-xs text-gray-400">
                Connect a wallet to claim your badge on {activeChain.name}.
              </p>
            </div>
          ) : isConfirmed ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-green-50 px-4 py-3 font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                ✓ Badge claimed!
              </div>
              {txHash && (
                <a
                  href={explorerTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#0052FF] underline"
                >
                  View transaction
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {chainId === activeChain.id && paymasterSupported && (
                <span className="inline-flex items-center rounded-full bg-[#0052FF]/10 px-2.5 py-0.5 text-xs font-medium text-[#0052FF]">
                  ⚡ Gasless
                </span>
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
                    : chainId !== activeChain.id
                      ? 'Switch network'
                      : 'Claim badge'}
              </button>
              {txError && (
                <p className="text-sm text-red-600">
                  {txError.message.includes('ClaimUsed')
                    ? 'This claim was already used.'
                    : txError.message.slice(0, 140)}
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
