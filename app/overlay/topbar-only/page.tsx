import { StreamerbotProvider } from '@/app/components/overlay/StreamerbotContext'
import TopBar from '@/app/components/overlay/TopBar'
import EventBar from '@/app/components/overlay/EventBar'
import { getStreamState } from '@/lib/server-state'

export default function TopBarOnlyOverlay() {
  const initialState = getStreamState()
  return (
    <StreamerbotProvider initialState={initialState}>
      <TopBar />
      <EventBar />
    </StreamerbotProvider>
  )
}
