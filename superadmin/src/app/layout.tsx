import type { Metadata } from 'next'
import { hankenGrotesk, jetbrainsMono, spaceGrotesk } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vitri · Superadmin',
  description: 'Métricas, errores y comentarios de todos los sitios.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
