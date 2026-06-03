import { SharedClaimClient } from './SharedClaimClient'

// «Один QR для всех»: статичный URL события. Каждый гость подключает кошелёк,
// получает свежую одноразовую подпись (лимит 1 на кошелёк) и клеймит.
export default async function SharedEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <SharedClaimClient id={id} />
}
