import { MODES } from '@/lib/engine/modes'
import type { GameState, ModeId } from '@/lib/engine/types'
import { KEY, readJson, writeJson, type Store } from './keys'

export type BestMap = Partial<Record<ModeId, number>>

export function loadBest(store: Store): BestMap {
  const roh = readJson(store, KEY.best)
  if (typeof roh !== 'object' || roh === null) return {}
  const out: BestMap = {}
  for (const [k, v] of Object.entries(roh as Record<string, unknown>)) {
    // Unbekannte Schlüssel stammen aus einer anderen Version — sie stillschweigend
    // mitzuschleppen hiesse, sie später als Modus anzuzeigen, den es nicht gibt.
    if (!(k in MODES)) continue
    if (typeof v === 'number' && Number.isFinite(v)) out[k as ModeId] = v
  }
  return out
}

export function clearBest(store: Store): void {
  try {
    store.removeItem(KEY.best)
  } catch {
    // Ein gesperrter Speicher ist kein Grund abzustürzen.
  }
}

/** True, wenn `metric` den bisherigen Wert schlägt. Ohne bisherigen Wert immer true. */
export function beatsBest(metric: number, prev: number | undefined, lowerBetter: boolean): boolean {
  if (prev === undefined) return true
  return lowerBetter ? metric < prev : metric > prev
}

/**
 * Hat der Lauf überhaupt etwas gemessen?
 *
 * `reaction.metric()` gibt bewusst 9999 zurück, wenn nichts gemessen wurde.
 * Bei `lowerBetter` wäre das trotzdem der erste und damit beste Wert — ein
 * Bestwert, den niemand gespielt hat. Klick- und Halte-Modi unterscheiden sich
 * darin, was „etwas passiert" heisst, deshalb beide Zähler.
 */
function hatGemessen(g: GameState): boolean {
  return g.shots > 0 || g.trackTotal > 0
}

/** Wertet einen beendeten Lauf. Gibt die neue Karte und zurück, ob es ein Bestwert war. */
export function submitBest(
  store: Store,
  g: GameState,
  best: BestMap,
): { best: BestMap; isBest: boolean } {
  if (!hatGemessen(g)) return { best, isBest: false }
  const metric = g.mode.metric(g)
  if (!Number.isFinite(metric)) return { best, isBest: false }
  if (!beatsBest(metric, best[g.mode.id], !!g.mode.lowerBetter)) return { best, isBest: false }
  const neu: BestMap = { ...best, [g.mode.id]: metric }
  writeJson(store, KEY.best, neu)
  return { best: neu, isBest: true }
}
