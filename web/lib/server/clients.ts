import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { activeChain, rpcUrl } from '../chain'

// Server-only viem-клиенты. DEPLOYER_PRIVATE_KEY = owner контракта (зовёт createEvent).
// Ключ берётся ТОЛЬКО из серверного env, не из NEXT_PUBLIC_. Сеть — из lib/chain.

export const publicClient = createPublicClient({
  chain: activeChain,
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
    chain: activeChain,
    transport: http(rpcUrl),
  })
}
