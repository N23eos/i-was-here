import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

// Server-only viem-клиенты. DEPLOYER_PRIVATE_KEY = owner контракта (зовёт createEvent).
// Ключ берётся ТОЛЬКО из серверного env, не из NEXT_PUBLIC_.

const rpcUrl =
  process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org'

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(rpcUrl),
})

// Аккаунт деплойера создаём лениво, чтобы импорт модуля не падал без ключа
// (например, на роутах, которым нужен только publicClient).
export function getDeployerWalletClient() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY is not set')

  const account = privateKeyToAccount(pk as `0x${string}`)
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  })
}
