import type { Metadata } from 'next'
import './globals.css'
import { headers } from 'next/headers'
import AuthGuard from '@/components/AuthGuard'

export const metadata: Metadata = {
  title: 'Gully Fame Admin',
  description: 'Admin and sponsor dashboard for Gully Fame competition and content management',
  // Private admin panel: keep it out of search indexes.
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Gully Fame Admin',
    description: 'Admin and sponsor dashboard for Gully Fame competition and content management',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Reading request headers opts every page into dynamic rendering. That is required for the
  // per-request CSP nonce set in middleware.ts: a statically prerendered page would be built
  // once with no nonce and its inline scripts would be blocked.
  headers()

  return (
    <html lang="en">
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  )
}

