import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Standalone output: required for the Docker image (smaller, self-contained)
  output: 'standalone',
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
}

export default nextConfig
