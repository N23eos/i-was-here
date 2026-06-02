// Метаданные NFT-бейджа. MVP: data: URI (без Pinata).
// image — статичный placeholder из /public. Реальный pin на IPFS + авто-генерация
// надписи события — post-MVP (см. ROADMAP / Sprint 04).
export function buildMetadataUri(eventName: string, baseUrl: string): string {
  const metadata = {
    name: eventName,
    description: `Proof of attendance: ${eventName}. "I Was Here" badge on Base.`,
    image: `${baseUrl}/badge-placeholder.svg`,
  }
  const json = JSON.stringify(metadata)
  const b64 = Buffer.from(json, 'utf8').toString('base64')
  return `data:application/json;base64,${b64}`
}
