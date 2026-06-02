import { encodePacked, keccak256 } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Подпись клейма (Locked-формат, должен совпадать с контрактом AttendanceNFT.claim):
//   hash = keccak256(abi.encodePacked(claimUUID:bytes32, eventId:uint256))
//   signature = personal_sign(hash)  // EIP-191, через signMessage({ raw })
// ВАЖНО: encodePacked, НЕ encode. viem keccak256, НЕ node sha3-256.
export async function signClaim(
  claimUUID: `0x${string}`,
  eventId: bigint,
  privateKey: `0x${string}`,
): Promise<`0x${string}`> {
  const hash = keccak256(
    encodePacked(['bytes32', 'uint256'], [claimUUID, eventId]),
  )
  const account = privateKeyToAccount(privateKey)
  // raw: подписываем сам хэш как сообщение → viem добавляет EIP-191 префикс,
  // что эквивалентно MessageHashUtils.toEthSignedMessageHash в контракте.
  return account.signMessage({ message: { raw: hash } })
}
