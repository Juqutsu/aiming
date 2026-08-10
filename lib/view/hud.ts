import { pc, pcNum } from '@/lib/engine/format'
import { SHOOT_SPEED } from '@/lib/engine/modes/counterstrafe'
import { PEEK_REACTION } from '@/lib/engine/modes/peek'
import { RUN } from '@/lib/engine/movement'
import type { GameState } from '@/lib/engine/types'
import { WEAPONS } from '@/lib/engine/weapons'

/** Alles, was React am HUD rendert. Wird alle 100 ms neu gebildet. */
export type HudSnapshot = {
  time: number
  score: number
  acc: string
  extraLabel: string
  extra: string | number
  /** null bei Modi ohne Munitionsanzeige. */
  ammo: number | null
  weapon: string
  hint: string
  cue: string | null
}

export function snapshot(g: GameState): HudSnapshot {
  const m = g.mode
  return {
    time: Math.ceil(g.left),
    score: g.score,
    // Halten ohne Magazin heißt Tracking: dort ist die Zeit auf dem Ziel die
    // aussagekräftige Quote, nicht Treffer pro Schuss.
    acc: m.hold && !m.ammoHud
      ? `${pcNum(g.trackTime, g.trackTotal).toFixed(0)}%`
      : pc(g.hits, g.shots),
    extraLabel: m.extraLabel ?? 'Streak',
    extra: m.hudExtra ? m.hudExtra(g) : g.streak,
    ammo: m.ammoHud ? (g.data.ammo as number) : null,
    weapon: WEAPONS[g.settings.weapon].name,
    hint: m.hint,
    cue: g.cue,
  }
}

/** Volle Balkenbreite bei Laufgeschwindigkeit. */
export function speedPct(sp: number): number {
  return Math.min(100, (sp / RUN) * 100)
}

/** Die grüne Zone endet dort, wo die Engine einen Schuss noch als aus dem Stand wertet. */
export const SPEED_ZONE_PCT = (SHOOT_SPEED / RUN) * 100

export function speedColor(sp: number): string {
  return sp <= SHOOT_SPEED ? 'var(--ok)' : 'var(--sig)'
}

/** Der Exposure-Balken ist auf knapp das Dreifache des Todesfensters skaliert. */
const EXPO_SCALE_MS = 900
/** Ab hier wird es unangenehm, auch wenn der Gegner noch nicht geschossen hat. */
const EXPO_WARN_MS = 600

export function expoPct(msValue: number): number {
  return Math.min(100, (msValue / EXPO_SCALE_MS) * 100)
}

export const EXPO_ZONE_PCT = ((PEEK_REACTION * 1000) / EXPO_SCALE_MS) * 100

export function expoColor(msValue: number): string {
  if (msValue < PEEK_REACTION * 1000) return 'var(--ok)'
  return msValue < EXPO_WARN_MS ? 'var(--warn)' : 'var(--sig)'
}
