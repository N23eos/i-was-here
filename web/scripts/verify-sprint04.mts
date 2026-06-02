// Verify Sprint 04: level boundaries + qr data url + pdf magic.
// pdf.ts тестируется через dev-роут (extensionless import не грузится node-раннером).
import assert from 'node:assert'
import { calcLevel } from '../lib/level.ts'
import { qrDataUrl } from '../lib/qr.ts'

// 1. level boundaries
assert.equal(calcLevel(0).name, 'None')
assert.equal(calcLevel(1).name, 'Bronze')
assert.equal(calcLevel(2).name, 'Bronze')
assert.equal(calcLevel(3).name, 'Silver')
assert.equal(calcLevel(5).name, 'Gold')
assert.equal(calcLevel(10).name, 'Platinum')
assert.equal(calcLevel(0).next, 1)
assert.equal(calcLevel(10).next, null)
console.log('✓ calcLevel boundaries')

// 2. qr data url
const qr = await qrDataUrl('http://localhost:3001/claim/abc')
assert.ok(qr.startsWith('data:image/png'), 'qr not png data url')
console.log('✓ qrDataUrl -> png')

console.log('\nLEVEL+QR VERIFY PASSED (pdf via dev route)')
