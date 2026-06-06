import { getStreamState } from '@/lib/server-state'
import StreamStartingContent from './StreamStartingContent'

export default function StreamStartingPage() {
  const initialState = getStreamState()
  return <StreamStartingContent initialState={initialState} />
}
