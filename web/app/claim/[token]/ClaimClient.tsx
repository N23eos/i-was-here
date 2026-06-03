'use client'

import { useEffect, useState } from 'react'
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useCapabilities,
  useSendCalls,
  useWaitForCallsStatus,
} from 'wagmi'
import { encodeFunctionData } from 'viem'
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

  // EIP-5792: умеет ли кошелёк спонсирование (paymasterService) на нашей сети.
  const { data: capabilities } = useCapabilities({ account: address })
  const paymasterSupported = Boolean(
    capabilities?.[baseSepolia.id]?.paymasterService?.supported
  )

  // Отправка claim() батчем с paymaster-capability (gasless).
  const {
    sendCalls,
    data: callsData,
    isPending,
    error: sendError,
  } = useSendCalls()
  const { data: callsStatus, isSuccess: isConfirmed } = useWaitForCallsStatus({
    id: callsData?.id as string,
    query: { enabled: Boolean(callsData?.id) },
  })
  const isConfirming = Boolean(callsData?.id) && !isConfirmed
  const txHash = callsStatus?.receipts?.[0]?.transactionHash

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
    // Абсолютный URL прокси — кошелёк сам фетчит paymasterService.url.
    const paymasterUrl = new URL(
      process.env.NEXT_PUBLIC_PAYMASTER_PROXY_URL ?? '/api/paymaster',
      window.location.origin
    ).toString()

    sendCalls({
      calls: [
        {
          to: claim.contractAddress,
          data: encodeFunctionData({
            abi: attendanceNftAbi,
            functionName: 'claim',
            args: [
              BigInt(claim.eventId),
              claim.claimUUID,
              address,
              claim.signature,
            ],
          }),
        },
      ],
      capabilities: { paymasterService: { url: paymasterUrl } },
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
        <p className="mt-1 text-sm text-gray-500">Proof-of-attendance badge</p>

        <div className="mt-6">
          {!isConnected ? (
            <div className="flex flex-col items-center gap-2">
              <WalletButton />
              <p className="mt-1 text-xs text-gray-400">
                Gasless on Base Sepolia — connect a Base Account.
              </p>
            </div>
          ) : isConfirmed ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-green-50 px-4 py-3 font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                ✓ Badge claimed!
              </div>
              {txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#0052FF] underline"
                >
                  View transaction
                </a>
              )}
            </div>
          ) : chainId === baseSepolia.id && !paymasterSupported ? (
            // Только gasless: кошелёк без спонсирования не пускаем (нет платного пути).
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              This wallet can&apos;t claim gas-free. Use a Base Account to claim
              your badge for free.
            </div>
          ) : (
            <div className="space-y-3">
              {chainId === baseSepolia.id && (
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
                    : chainId !== baseSepolia.id
                      ? 'Switch network'
                      : 'Claim badge'}
              </button>
              {sendError && (
                <p className="text-sm text-red-600">
                  {sendError.message.includes('ClaimUsed')
                    ? 'This claim was already used.'
                    : sendError.message.slice(0, 140)}
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
