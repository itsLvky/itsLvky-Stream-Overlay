import SocialBanner from '@/app/components/overlay/SocialBanner'

export default function OverlayRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SocialBanner />
    </>
  )
}
