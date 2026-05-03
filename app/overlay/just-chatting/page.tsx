import { StreamerbotProvider } from '@/app/components/overlay/StreamerbotContext'
import TopBar from '@/app/components/overlay/TopBar'
import EventBar from '@/app/components/overlay/EventBar'
import ChatPanel from '@/app/components/overlay/ChatPanel'

export default function JustChattingOverlay() {
  return (
    <StreamerbotProvider>
      <div className="fixed inset-0 flex flex-col" style={{ width: '100vw', height: '100vh' }}>
        <TopBar />
        <EventBar />

        <div className="flex flex-1 overflow-hidden">
          {/* Transparent webcam area – OBS-Quelle scheint durch */}
          <div className="flex-1" />

          {/* Chat */}
          <ChatPanel />
        </div>
      </div>
    </StreamerbotProvider>
  )
}
