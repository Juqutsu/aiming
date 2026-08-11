import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { SettingsProvider } from '@/components/settings/SettingsProvider'
import './globals.css'
import './range.css'

/**
 * Zwei Schnitte, klar getrennte Aufgaben: Geist trägt die Oberfläche, Geist Mono
 * jede Zahl. In einem Trainer sind Zahlen der Inhalt — sie brauchen feste
 * Zeichenbreiten, damit eine tickende Uhr die Zeile nicht verschiebt.
 */
const sans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const mono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'RANGE — Aim & Movement Trainer',
  description: 'Aim- und Movement-Trainer nach Valorant-Vorbild.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // `dark` fest gesetzt: RANGE hat keinen hellen Modus, und ohne die Klasse
    // greifen die shadcn-Tokens aus globals.css in ihrer hellen Fassung.
    <html lang="de" className={`dark ${sans.variable} ${mono.variable}`}>
      <body>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  )
}
