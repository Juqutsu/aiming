import { MODES } from '@/lib/engine/modes'
import type { ModeId } from '@/lib/engine/types'
import type { Run } from '@/lib/store/runs'

export type DayRow = {
  /** Lokales Datum als `YYYY-MM-DD`. */
  day: string
  runs: number
  modes: ModeId[]
  /** Bester Metrikwert des Tages je Modus: das Maximum, bei `lowerBetter` das Minimum. */
  best: Partial<Record<ModeId, number>>
}

/**
 * Lokales Datum.
 *
 * Ein Lauf um 23:50 gehört zu dem Tag, an dem er sich für den Spielenden
 * angefühlt hat, nicht zu dem, den UTC dafür hält.
 */
export function dayKey(t: number): string {
  const d = new Date(t)
  const zwei = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`
}

/** Alle Läufe nach Tag, jüngster zuerst. Abweichende Läufe zählen mit. */
export function byDay(runs: Run[]): DayRow[] {
  const tage = new Map<string, DayRow>()
  for (const r of runs) {
    const key = dayKey(r.t)
    let zeile = tage.get(key)
    if (!zeile) {
      zeile = { day: key, runs: 0, modes: [], best: {} }
      tage.set(key, zeile)
    }
    zeile.runs++
    if (!zeile.modes.includes(r.mode)) zeile.modes.push(r.mode)
    const bisher = zeile.best[r.mode]
    // Bei Reaktion ist der beste Wert der kleinste. Diese Umkehr passiert hier
    // und nie in der Ansicht.
    const besser =
      bisher === undefined || (MODES[r.mode].lowerBetter ? r.metric < bisher : r.metric > bisher)
    if (besser) zeile.best[r.mode] = r.metric
  }
  return [...tage.values()].sort((a, b) => (a.day < b.day ? 1 : -1))
}
