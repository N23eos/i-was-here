// Адрес задеплоенного AttendanceNFT (Base Sepolia, Sprint 02) + ABI.
import { baseSepolia } from 'viem/chains'
import { attendanceNftAbi } from './abi'

export { attendanceNftAbi }

// NEXT_PUBLIC_ — нужен и на сервере, и на клиенте (read NFT-баланса, claim()).
export const attendanceNftAddress = process.env
  .NEXT_PUBLIC_ATTENDANCE_NFT_ADDRESS as `0x${string}`

export const chain = baseSepolia
