import type { Metadata } from 'next'
import { Roboto_Condensed } from 'next/font/google'
import './globals.css'
import './range.css'

const condensed = Roboto_Condensed({
  variable: '--font-condensed',
  subsets: ['latin'],
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'RANGE — Aim & Movement Trainer',
  description: 'Aim- und Movement-Trainer nach Valorant-Vorbild.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="de" className={condensed.variable}>
      <body>{children}</body>
    </html>
  )
}
