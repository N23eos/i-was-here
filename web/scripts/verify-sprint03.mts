// Verify-скрипт Sprint 03: crypto round-trip + signature recover.
// Запуск: node --experimental-strip-types scripts/verify-sprint03.mts
// (SIGNER_MASTER_KEY должен быть в env).
import assert from 'node:assert'
import { recoverMessageAddress, encodePacked, keccak256, toHex } from 'viem'
import { randomBytes } from 'node:crypto'
import { encryptKey, decryptKey, genSigner } from '../lib/crypto.ts'
import { signClaim } from '../lib/signing.ts'

// 1. AES round-trip
const secret = '0xdeadbeef'.padEnd(66, 'a')
const ct = encryptKey(secret)
assert.equal(decryptKey(ct), secret, 'AES round-trip failed')
assert.notEqual(ct, secret, 'ciphertext must differ from plaintext')
console.log('✓ AES-256-GCM round-trip')

// 2. Signature recover == signerAddress (имитация контракта ecrecover)
const { privateKey, address } = genSigner()
const claimUUID = toHex(randomBytes(32))
const eventId = 123456789n
const sig = await signClaim(claimUUID, eventId, privateKey)

const hash = keccak256(encodePacked(['bytes32', 'uint256'], [claimUUID, eventId]))
const recovered = await recoverMessageAddress({ message: { raw: hash }, signature: sig })
assert.equal(recovered.toLowerCase(), address.toLowerCase(), 'recover != signer')
console.log('✓ signClaim recover == signerAddress')

console.log('\nALL VERIFY PASSED')
