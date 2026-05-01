import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TopBar Only – Overlay',
}

export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body {
          background: transparent !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      {children}
    </>
  )
}
