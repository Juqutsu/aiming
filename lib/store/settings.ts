import { DEFAULT_CROSSHAIR, type CrosshairConfig } from '@/lib/crosshair/draw'
import { DEFAULT_SETTINGS } from '@/lib/engine/game'
import type { Settings, WeaponId } from '@/lib/engine/types'
import { KEY, readJson, writeJson, type Store } from './keys'

/** Grenzen der Regler, wie im Original (`reference/index.html`, Zeile 207–241). */
export const LIMITS = {
  sens: [0.05, 1.2],
  dpi: [100, 6400],
  dur: [15, 180],
  sizeMul: [0.5, 1.8],
  gap: [0, 14],
  len: [0, 20],
  thick: [1, 6],
} as const

const WEAPONS_ERLAUBT: readonly WeaponId[] = ['vandal', 'phantom']

const HEX = /^#[0-9a-f]{6}$/i

/**
 * Zahl aus dem Speicher, geklemmt statt verworfen.
 *
 * Eine Sensitivity von 999 aus einer alten Version ist ein Wert, den jemand
 * einmal wollte — kein Datenmüll. Nur was gar keine endliche Zahl ist, fällt
 * auf den Standard zurück.
 */
function num(v: unknown, lo: number, hi: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.min(hi, Math.max(lo, v))
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

/** Der gelesene Rohwert als Feldsammlung. Alles andere gilt als leer. */
function felder(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}
}

export function loadSettings(store: Store): Settings {
  const r = felder(readJson(store, KEY.settings))
  const d = DEFAULT_SETTINGS
  return {
    sens: num(r.sens, LIMITS.sens[0], LIMITS.sens[1], d.sens),
    dpi: num(r.dpi, LIMITS.dpi[0], LIMITS.dpi[1], d.dpi),
    dur: num(r.dur, LIMITS.dur[0], LIMITS.dur[1], d.dur),
    sizeMul: num(r.sizeMul, LIMITS.sizeMul[0], LIMITS.sizeMul[1], d.sizeMul),
    weapon: oneOf(r.weapon, WEAPONS_ERLAUBT, d.weapon),
    sound: bool(r.sound, d.sound),
  }
}

export function saveSettings(store: Store, s: Settings): void {
  writeJson(store, KEY.settings, s)
}

export function loadCrosshair(store: Store): CrosshairConfig {
  const r = felder(readJson(store, KEY.crosshair))
  const d = DEFAULT_CROSSHAIR
  return {
    color: typeof r.color === 'string' && HEX.test(r.color) ? r.color : d.color,
    gap: num(r.gap, LIMITS.gap[0], LIMITS.gap[1], d.gap),
    len: num(r.len, LIMITS.len[0], LIMITS.len[1], d.len),
    thick: num(r.thick, LIMITS.thick[0], LIMITS.thick[1], d.thick),
    dot: bool(r.dot, d.dot),
    outline: bool(r.outline, d.outline),
  }
}

export function saveCrosshair(store: Store, c: CrosshairConfig): void {
  writeJson(store, KEY.crosshair, c)
}
