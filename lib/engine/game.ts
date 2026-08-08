import { basis, createCamera } from './camera'
import { createPlayer, movePlayer } from './movement'
import type { Fx, GameState, Input, ModeDef, Settings, SoundId, Target, Vec3 } from './types'

export const DEFAULT_SETTINGS: Settings = {
  sens: 0.22,
  dpi: 800,
  dur: 60,
  sizeMul: 1.0,
  weapon: 'vandal',
  sound: true,
}

/** Über dieser Zeit stammt ein Treffer aus einem verschleppten Ziel und verzerrt den Schnitt. */
const MAX_TTK_MS = 4000

export function createGame(
  mode: ModeDef,
  settings: Settings,
  dur = settings.dur,
  rng: () => number = Math.random,
): GameState {
  const g: GameState = {
    mode,
    dur,
    t: 0,
    left: dur,
    score: 0,
    hits: 0,
    shots: 0,
    streak: 0,
    bestStreak: 0,
    ttk: [],
    react: [],
    targets: [],
    holes: [],
    data: {},
    trackTime: 0,
    trackTotal: 0,
    over: false,
    cue: null,
    fx: [],
    sounds: [],
    player: createPlayer(),
    camera: createCamera(),
    settings,
    rng,
  }
  mode.start(g)
  return g
}

/** Ein Simulationsschritt. Nach dem Rundenende wirkungslos. */
export function tick(g: GameState, input: Input, dt: number): void {
  if (g.over) return
  g.t += dt
  g.left = Math.max(0, g.dur - g.t)
  basis(g.camera)
  if (g.mode.move) movePlayer(g.player, g.camera, input.keys, dt)
  g.mode.tick(g, input, dt)
  if (g.left <= 0) endGame(g)
}

/** Ein Schuss. Modi ohne `fire` werten über `tick` aus (Halten statt Klicken). */
export function fire(g: GameState): void {
  if (g.over) return
  g.mode.fire?.(g)
}

export function endGame(g: GameState): void {
  g.over = true
}

/** Hängt einen Ton an die Warteschlange. Die Ansicht spielt ihn ab und leert die Liste. */
export function play(g: GameState, id: SoundId): void {
  g.sounds.push(id)
}

/** Hängt ein Treffer-Feedback an. `at` ist eine Weltposition oder die Bildmitte. */
export function pushFx(g: GameState, at: Vec3 | 'center', text: string, kind: Fx['kind']): void {
  g.fx.push({ at, text, kind })
}

export function registerHit(g: GameState, t: Target, label = '+1'): void {
  g.hits++
  g.streak++
  g.bestStreak = Math.max(g.bestStreak, g.streak)
  const dt = (g.t - t.born) * 1000
  if (dt > 0 && dt < MAX_TTK_MS) g.ttk.push(dt)
  pushFx(g, { x: t.x, y: t.y, z: t.z }, label, 'good')
  play(g, 'hit')
}

export function registerMiss(g: GameState, label?: string): void {
  g.streak = 0
  if (label) pushFx(g, 'center', label, 'bad')
  play(g, 'miss')
}
