'use client'

import { http, cookieStorage, createConfig, createStorage } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { baseAccount } from '@wagmi/connectors'

// MetaMask / Rabby обнаруживаются автоматически через EIP-6963
// (multiInjectedProviderDiscovery включён по умолчанию) — отдельными кнопками.
// baseAccount — вход по email/Base Account. Generic injected() убран, чтобы
// не дублировать обнаруженные кошельки кнопкой "Injected".
export const config = createConfig({
  chains: [baseSepolia],
  connectors: [baseAccount({ appName: 'I Was Here' })],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org'
    ),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
