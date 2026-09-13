import { StreamerbotProvider } from '@/app/components/overlay/StreamerbotContext'
import PortraitTopBar from '@/app/components/overlay/PortraitTopBar'
import EventBar from '@/app/components/overlay/EventBar'
import ChatPanel from '@/app/components/overlay/ChatPanel'
import { getStreamState } from '@/lib/server-state'

// Ohne das prerendert Next die Seite zur Build-Zeit und liefert dauerhaft
// den Stand aus der DB von damals aus. Die SSE-Verbindung korrigiert das
// zwar sofort, aber erst nach dem ersten Frame.
export const dynamic = 'force-dynamic'

export default function JustChattingPortraitOverlay() {
  const initialState = getStreamState()
  return (
    <StreamerbotProvider initialState={initialState}>
      <div className="fixed inset-0 flex flex-col" style={{ width: '100vw', height: '100vh' }}>
        <PortraitTopBar />
        <EventBar />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Transparent webcam/game area – OBS-Quelle scheint durch */}
          <div className="flex-1" />

          {/* Chat */}
          <ChatPanel variant="bottom" height="38vh" />
        </div>
      </div>
    </StreamerbotProvider>
  )
}
