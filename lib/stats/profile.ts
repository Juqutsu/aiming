import { avg } from '@/lib/engine/format'
import { MODES } from '@/lib/engine/modes'
import type { ModeId } from '@/lib/engine/types'
import { isStandard, type Run } from '@/lib/store/runs'

export type ProfileRow = {
  mode: ModeId
  /** Schnitt der letzten fünf vergleichbaren Läufe, oder aller, wenn es weniger sind. */
  recent: number
  /** Schnitt aller vergleichbaren Läufe. */
  average: number
  /** Abweichung in Prozent, vorzeichenrichtig: positiv heisst besser. */
  delta: number
  /** Zahl der vergleichbaren Läufe, aus denen die Zeile stammt. */
  runs: number
}

const RECENT = 5

/** Der Bereich, den der Balken abbildet: ±20 % um den eigenen Schnitt. */
const SPANNE = 20

export function profile(runs: Run[]): ProfileRow[] {
  const nachModus = new Map<ModeId, number[]>()
  for (const r of runs) {
    // Ein Schnitt aus gemischten Bedingungen ist keine Zahl, die etwas bedeutet.
    if (!isStandard(r)) continue
    const liste = nachModus.get(r.mode)
    if (liste) liste.push(r.metric)
    else nachModus.set(r.mode, [r.metric])
  }

  const zeilen: ProfileRow[] = []
  for (const [mode, werte] of nachModus) {
    // Ein Schnitt aus einem Lauf ist derselbe Lauf.
    if (werte.length < 2) continue
    const average = avg(werte)
    const recent = avg(werte.slice(-RECENT))
    const roh = average === 0 ? 0 : ((recent - average) / Math.abs(average)) * 100
    // Bei Reaktion ist der kleinere Wert besser. Diese Umkehr passiert hier und
    // nie in der Ansicht.
    const delta = MODES[mode].lowerBetter ? -roh : roh
    zeilen.push({ mode, recent, average, delta, runs: werte.length })
  }
  // Das Schwächste nach oben: die Zeile, an der zu arbeiten am meisten bringt.
  return zeilen.sort((a, b) => a.delta - b.delta)
}

/** Balkenfüllung 0..1. Der eigene Schnitt liegt in der Mitte, ±20 % sind die Ränder. */
export function barFill(delta: number): number {
  return Math.min(1, Math.max(0.04, (delta + SPANNE) / (SPANNE * 2)))
}
