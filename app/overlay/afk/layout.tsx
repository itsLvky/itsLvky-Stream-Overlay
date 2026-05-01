import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AFK – Overlay',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body {
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      {children}
    </>
  )
}
