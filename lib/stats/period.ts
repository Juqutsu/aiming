import type { Run } from '@/lib/store/runs'

export type Period = '7d' | '30d' | 'all'

/** Das Modul heisst `period` und nicht `range`: „Range" ist in diesem Projekt der Schiessstand. */
const TAGE: Record<Period, number> = { '7d': 7, '30d': 30, all: 0 }

/**
 * Läufe im Zeitraum, von `now` aus zurück gemessen. `all` filtert nicht.
 *
 * „7 Tage" heisst die letzten sieben Kalendertage einschliesslich heute, nicht
 * 168 Stunden ab jetzt. Die Grenze liegt deshalb auf lokaler Mitternacht statt
 * `now - N × 24 h` — sonst zeigt `byDay`, das nach lokalem Kalendertag
 * gruppiert, für den ältesten Tag nur einen Teil der Läufe, aber die volle
 * Tagesbeschriftung.
 */
export function inPeriod(runs: Run[], period: Period, now: number): Run[] {
  if (period === 'all') return runs
  const ab = new Date(now)
  ab.setHours(0, 0, 0, 0)
  ab.setDate(ab.getDate() - (TAGE[period] - 1))
  return runs.filter((r) => r.t >= ab.getTime())
}
