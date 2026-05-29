'use client'

import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'

export function ConnectWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()

  if (isReconnecting || isConnecting) {
    return (
      <button disabled className="px-4 py-2 bg-gray-300 rounded text-sm">
        Connecting...
      </button>
    )
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        {chainId !== baseSepolia.id && (
          <span className="text-xs text-amber-600">
            Wrong network — switch to Base Sepolia
          </span>
        )}
        <button
          onClick={() => disconnect()}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        // Default to first connector (Base Account) if available
        const baseConnector = connectors.find((c) => c.id === 'baseAccount')
        connect({ connector: baseConnector ?? connectors[0] })
      }}
      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
    >
      Connect Wallet
    </button>
  )
}
