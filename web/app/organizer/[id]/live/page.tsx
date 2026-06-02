import { LiveScreen } from './LiveScreen'

export default async function LivePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <LiveScreen id={id} />
}
