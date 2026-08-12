import { DEFAULT_SETTINGS } from '@/lib/engine/game'
import type { ModeId } from '@/lib/engine/types'
import { isStandard, type Run } from '@/lib/store/runs'

export type TrendPoint = {
  t: number
  metric: number
  /** `standard` heisst: unter Standardbedingungen gespielt, also vergleichbar. */
  standard: boolean
  /** Waffe und alles, was von den Standardbedingungen abwich — der Text des Tooltips. */
  note: string
}

const WAFFE: Record<Run['weapon'], string> = { vandal: 'Vandal', phantom: 'Phantom' }

/**
 * „Phantom · 90 s · Ziele 150 %".
 *
 * Der Text entsteht hier und nicht in der Ansicht: er ist ein Vergleich mit
 * `DEFAULT_SETTINGS`, und der gehört zur Auswertung.
 */
function note(r: Run): string {
  const teile = [WAFFE[r.weapon]]
  if (r.dur !== DEFAULT_SETTINGS.dur) teile.push(`${r.dur} s`)
  if (r.size !== DEFAULT_SETTINGS.sizeMul) teile.push(`Ziele ${Math.round(r.size * 100)} %`)
  return teile.join(' · ')
}

/** Die Punkte einer Modus-Kurve, ältester zuerst. Abweichende Läufe sind dabei und markiert. */
export function trend(runs: Run[], mode: ModeId): TrendPoint[] {
  return runs
    .filter((r) => r.mode === mode)
    .sort((a, b) => a.t - b.t)
    .map((r) => ({ t: r.t, metric: r.metric, standard: isStandard(r), note: note(r) }))
}

/**
 * Index des besten **vergleichbaren** Punktes, oder -1.
 *
 * Ein abweichender Lauf (`standard === false`) scheidet aus, auch wenn sein
 * Wert der höchste in der Liste ist — sonst läge der Akzent unter einem Punkt,
 * den die eigene Legende als „abweichend" markiert. Gibt es keinen
 * vergleichbaren Punkt, -1.
 *
 * Die einzige Stelle, an der die Farbe eines Punktes von `lowerBetter` abhängt —
 * die Charts bekommen nur noch eine Zahl.
 */
export function bestIndex(points: TrendPoint[], lowerBetter: boolean): number {
  let idx = -1
  for (let i = 0; i < points.length; i++) {
    if (!points[i].standard) continue
    if (idx < 0) {
      idx = i
      continue
    }
    const besser = lowerBetter
      ? points[i].metric < points[idx].metric
      : points[i].metric > points[idx].metric
    if (besser) idx = i
  }
  return idx
}
