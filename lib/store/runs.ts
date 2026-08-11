import { DEFAULT_SETTINGS } from '@/lib/engine/game'
import { MODES } from '@/lib/engine/modes'
import type { GameState, ModeId, WeaponId } from '@/lib/engine/types'
import { hasMeasured } from './best'
import { KEY, readJson, writeJson, type Store } from './keys'

export type Run = {
  /** Zeitstempel in Millisekunden, gesetzt beim Eintragen. */
  t: number
  mode: ModeId
  /** Dieselbe Zahl, die auch über den Bestwert entscheidet. */
  metric: number
  score: number
  hits: number
  shots: number
  /** Die Bedingungen, unter denen gespielt wurde. */
  dur: number
  size: number
  weapon: WeaponId
}

/**
 * Deckel des Verlaufs. Rund 90 Byte je Lauf, also etwa 45 KB gegen ein Budget
 * von 5 MB — der Deckel schützt nicht vor dem Speicher, sondern vor einer
 * Kurve, die niemand mehr liest.
 */
export const MAX_RUNS = 500

function zahl(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/**
 * Ein einzelner Eintrag aus dem Speicher.
 *
 * Feldweise geprüft statt vertraut: ein halb geschriebener Eintrag aus einer
 * abgebrochenen Sitzung darf den ganzen Verlauf nicht wertlos machen.
 */
function isRun(v: unknown): v is Run {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    zahl(r.t) && zahl(r.metric) && zahl(r.score) && zahl(r.hits) && zahl(r.shots) &&
    zahl(r.dur) && zahl(r.size) &&
    typeof r.mode === 'string' && r.mode in MODES &&
    (r.weapon === 'vandal' || r.weapon === 'phantom')
  )
}

export function loadRuns(store: Store): Run[] {
  const roh = readJson(store, KEY.runs)
  return Array.isArray(roh) ? roh.filter(isRun) : []
}

export function clearRuns(store: Store): void {
  try {
    store.removeItem(KEY.runs)
  } catch {
    // Ein gesperrter Speicher ist kein Grund abzustürzen.
  }
}

/**
 * Vergleichbar heisst: dieselbe Rundenzeit und dieselbe Zielgrösse wie im
 * Standard. Referenz sind ausdrücklich die Standardwerte, nicht die gerade
 * eingestellten — sonst verschöbe sich die Bedeutung der Kurve rückwirkend,
 * sobald jemand an den Reglern dreht. Die Waffe zählt nicht hinein: sie ändert
 * Spray und Munitionsanzeige, nicht die Schwierigkeit der Aim-Modi.
 */
export function isStandard(r: Run): boolean {
  return r.dur === DEFAULT_SETTINGS.dur && r.size === DEFAULT_SETTINGS.sizeMul
}

/** Trägt einen beendeten Lauf ein und gibt den vollständigen Verlauf zurück. */
export function pushRun(store: Store, g: GameState, now: number): Run[] {
  // Derselbe Wächter wie beim Bestwert: ein Lauf ohne Schuss und ohne Feuerzeit
  // hat nichts gemessen, und `reaction.metric()` gäbe dafür 9999 zurück.
  if (!hasMeasured(g)) return loadRuns(store)
  const metric = g.mode.metric(g)
  if (!Number.isFinite(metric)) return loadRuns(store)
  const run: Run = {
    t: now,
    mode: g.mode.id,
    metric,
    score: g.score,
    hits: g.hits,
    shots: g.shots,
    dur: g.dur,
    size: g.settings.sizeMul,
    weapon: g.settings.weapon,
  }
  const alle = [...loadRuns(store), run].slice(-MAX_RUNS)
  writeJson(store, KEY.runs, alle)
  return alle
}

/**
 * Beginn dieser Sitzung, beim ersten Lesen gesetzt.
 *
 * In `sessionStorage` und nicht in einem Ref: `sessionStorage` überlebt einen
 * Reload innerhalb des Tabs, ein Ref nicht — und gemeint ist „seit dieses Tab
 * offen ist".
 */
export function sessionStart(store: Store, now: number): number {
  const roh = readJson(store, KEY.sessionStart)
  if (zahl(roh)) return roh
  writeJson(store, KEY.sessionStart, now)
  return now
}
