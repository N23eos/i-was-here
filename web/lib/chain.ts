import { base, baseSepolia } from 'viem/chains'

// Единая точка выбора сети. Управляется NEXT_PUBLIC_CHAIN_ID:
//   8453  → Base mainnet
//   84532 → Base Sepolia (testnet, дефолт)
// Переключение testnet↔mainnet — одной переменной окружения.
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? baseSepolia.id)

export const activeChain = CHAIN_ID === base.id ? base : baseSepolia

// RPC активной сети: override через env, иначе публичный дефолт сети из viem.
export const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ?? activeChain.rpcUrls.default.http[0]

// Ссылка на транзакцию в обозревателе активной сети
// (base → basescan.org, baseSepolia → sepolia.basescan.org).
export function explorerTxUrl(hash: string) {
  return `${activeChain.blockExplorers.default.url}/tx/${hash}`
}
