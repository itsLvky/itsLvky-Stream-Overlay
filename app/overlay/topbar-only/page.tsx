import { StreamerbotProvider } from '@/app/components/overlay/StreamerbotContext'
import TopBar from '@/app/components/overlay/TopBar'
import EventBar from '@/app/components/overlay/EventBar'

export default function TopBarOnlyOverlay() {
  return (
    <StreamerbotProvider>
      <TopBar />
      <EventBar />
    </StreamerbotProvider>
  )
}
