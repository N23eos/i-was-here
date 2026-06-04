// Адрес задеплоенного AttendanceNFT + ABI. Сеть — из lib/chain.
import { activeChain } from './chain'
import { attendanceNftAbi } from './abi'

export { attendanceNftAbi }

// NEXT_PUBLIC_ — нужен и на сервере, и на клиенте (read NFT-баланса, claim()).
export const attendanceNftAddress = process.env
  .NEXT_PUBLIC_ATTENDANCE_NFT_ADDRESS as `0x${string}`

export const chain = activeChain
