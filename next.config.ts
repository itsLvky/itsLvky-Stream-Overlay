import tsrxReactTurbopack from '@tsrx/turbopack-plugin-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default tsrxReactTurbopack({
  // Standalone output: required for the Docker image (smaller, self-contained)
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Twitch CDN für Emotes und Badges
      { protocol: 'https', hostname: 'static-cdn.jtvnw.net' },
      // 7TV / BetterTTV / FrankerFaceZ (für spätere Erweiterung)
      { protocol: 'https', hostname: 'cdn.7tv.app' },
      { protocol: 'https', hostname: 'cdn.betterttv.net' },
      { protocol: 'https', hostname: 'cdn.frankerfacez.com' },
    ],
  },
} as any)
