export function register() {
  // Nur im Node-Runtime — der Edge-Runtime hat keinen langlebigen Prozess.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // EventSub startet mit dem Server, nicht erst wenn das erste Overlay lädt.
  // So sind Follower/Rewards auch dann korrekt, wenn OBS erst später startet.
  return import('./lib/twitch-eventsub').then(({ ensureEventSub }) => {
    ensureEventSub()
  })
}
