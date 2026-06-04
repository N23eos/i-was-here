'use client'

import { http, cookieStorage, createConfig, createStorage } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { baseAccount } from '@wagmi/connectors'
import { activeChain, rpcUrl } from '@/lib/chain'

// MetaMask / Rabby обнаруживаются автоматически через EIP-6963
// (multiInjectedProviderDiscovery включён по умолчанию) — отдельными кнопками.
// baseAccount — вход по email/Base Account. Generic injected() убран, чтобы
// не дублировать обнаруженные кошельки кнопкой "Injected".
// Сеть — из lib/chain (NEXT_PUBLIC_CHAIN_ID).
export const config = createConfig({
  chains: [activeChain],
  connectors: [baseAccount({ appName: 'I Was Here' })],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  // Активна одна сеть (activeChain), но тип Register требует транспорты для всех
  // возможных id union'а — задаём оба, рантайм использует активную.
  transports: {
    [base.id]: http(rpcUrl),
    [baseSepolia.id]: http(rpcUrl),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
