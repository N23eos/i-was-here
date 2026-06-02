import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

// Шифрование приватного ключа-подписанта события (AES-256-GCM).
// Формат шифротекста: base64( iv[12] | tag[16] | ciphertext ).
// Master-key — 32-байтный hex из env SIGNER_MASTER_KEY (AES-256).
// MVP: env. Перед mainnet — CDP KMS (см. ARCHITECTURE).

const IV_LEN = 12 // GCM рекомендованный nonce
const TAG_LEN = 16

function masterKey(): Buffer {
  const hex = process.env.SIGNER_MASTER_KEY
  if (!hex) throw new Error('SIGNER_MASTER_KEY is not set')
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) {
    throw new Error('SIGNER_MASTER_KEY must be 32 bytes (64 hex chars)')
  }
  return key
}

export function encryptKey(plaintext: string): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', masterKey(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decryptKey(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64')
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv('aes-256-gcm', masterKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

// Генерация нового keypair-подписанта события.
export function genSigner(): { privateKey: `0x${string}`; address: `0x${string}` } {
  const privateKey = generatePrivateKey()
  const address = privateKeyToAccount(privateKey).address
  return { privateKey, address }
}
