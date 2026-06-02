import { ClaimClient } from './ClaimClient'

// Server-обёртка: разворачивает async params (Next 16) → отдаёт token клиенту.
export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <ClaimClient token={token} />
}
