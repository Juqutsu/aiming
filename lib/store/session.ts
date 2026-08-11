import { pc } from '@/lib/engine/format'
import type { GameState } from '@/lib/engine/types'
import { KEY, readJson, writeJson, type Store } from './keys'

/** Eine Zeile der Verlaufstabelle im Ergebnis-Schirm. */
export type RunRow = { mode: string; score: number; acc: string; detail: string }

/** Deckel, damit die Tabelle im Ergebnis-Schirm nicht endlos wächst. */
export const MAX_ROWS = 20

function istZeile(v: unknown): v is RunRow {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.mode === 'string' &&
    typeof r.score === 'number' &&
    typeof r.acc === 'string' &&
    typeof r.detail === 'string'
  )
}

export function loadSession(store: Store): RunRow[] {
  const roh = readJson(store, KEY.session)
  return Array.isArray(roh) ? roh.filter(istZeile) : []
}

/**
 * Trägt einen beendeten Lauf ein und gibt den vollständigen Verlauf zurück.
 *
 * Das Detail ist der dritte Statistik-Wert des Modus — dieselbe Spalte wie im
 * Original (`reference/index.html`, Zeile 1259). Welcher das ist, entscheidet
 * jeder Modus für sich; die Tabelle beschriftet sie deshalb nicht.
 */
export function pushRun(store: Store, g: GameState): RunRow[] {
  const rows = g.mode.stats(g)
  const zeile: RunRow = {
    mode: g.mode.name,
    score: g.score,
    acc: pc(g.hits, g.shots),
    detail: rows[2] ? String(rows[2][1]) : '–',
  }
  const alle = [...loadSession(store), zeile].slice(-MAX_ROWS)
  writeJson(store, KEY.session, alle)
  return alle
}

export function clearSession(store: Store): void {
  try {
    store.removeItem(KEY.session)
  } catch {
    // Ein gesperrter Speicher ist kein Grund abzustürzen.
  }
}
