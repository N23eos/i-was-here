'use client'

import { useAccount, useReadContract } from 'wagmi'
import { attendanceNftAbi, attendanceNftAddress } from '@/lib/contract'

// Owner-gate: подключённый кошелёк == on-chain owner() контракта.
// MVP-аутентификация организатора (Sprint 04). Серверная проверка — Sprint 06.
export function useIsOwner() {
  const { address, isConnected } = useAccount()
  const { data: owner, isLoading } = useReadContract({
    address: attendanceNftAddress,
    abi: attendanceNftAbi,
    functionName: 'owner',
  })

  const isOwner =
    isConnected &&
    !!owner &&
    !!address &&
    owner.toLowerCase() === address.toLowerCase()

  return { isOwner, isConnected, isLoading, owner, address }
}
