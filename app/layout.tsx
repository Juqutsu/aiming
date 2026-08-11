import type { Metadata } from 'next'
import { Roboto_Condensed } from 'next/font/google'
import { SettingsProvider } from '@/components/settings/SettingsProvider'
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
    // `dark` fest gesetzt: RANGE hat keinen hellen Modus, und ohne die Klasse
    // greifen die shadcn-Tokens aus globals.css in ihrer hellen Fassung.
    <html lang="de" className={`dark ${condensed.variable}`}>
      <body>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  )
}
