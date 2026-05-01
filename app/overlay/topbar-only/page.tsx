import { StreamerbotProvider } from '@/app/components/overlay/StreamerbotContext'
import TopBar from '@/app/components/overlay/TopBar'

export default function TopBarOnlyOverlay() {
  return (
    <StreamerbotProvider>
      <TopBar />
    </StreamerbotProvider>
  )
}
