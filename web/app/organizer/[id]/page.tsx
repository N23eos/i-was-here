import { EventDetail } from './EventDetail'

export default async function OrganizerEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EventDetail id={id} />
}
