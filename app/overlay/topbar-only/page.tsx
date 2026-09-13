import { StreamerbotProvider } from '@/app/components/overlay/StreamerbotContext'
import TopBar from '@/app/components/overlay/TopBar'
import EventBar from '@/app/components/overlay/EventBar'
import { getStreamState } from '@/lib/server-state'

// Ohne das prerendert Next die Seite zur Build-Zeit und liefert dauerhaft
// den Stand aus der DB von damals aus. Die SSE-Verbindung korrigiert das
// zwar sofort, aber erst nach dem ersten Frame.
export const dynamic = 'force-dynamic'

export default function TopBarOnlyOverlay() {
  const initialState = getStreamState()
  return (
    <StreamerbotProvider initialState={initialState}>
      <TopBar />
      <EventBar />
    </StreamerbotProvider>
  )
}
