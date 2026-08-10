import { avg } from '../format'
import { play, pushFx } from '../game'
import { DEG, dirFrom } from '../math'
import { WEAPONS } from '../weapons'
import type { GameState, ModeDef } from '../types'

/** Entfernung der Wand in Metern. */
export const SPRAY_WALL_Z = 15
/** Zielpunkt auf der Wand. */
export const SPRAY_AIM = { x: 0, y: 1.75 }
/** Innerhalb dieses Radius zählt ein Einschlag als sitzend. */
export const SPRAY_RADIUS = 0.25
/** Ab diesem Wert gilt ein Magazin als gut kontrolliert. */
const GOOD_SCORE = 70
/** Sekunden bis zum automatischen Nachladen. */
const RELOAD_DELAY = 1.6
/** Musterschritte pro Sekunde, um die sich der Rückstoß erholt. */
const RECOVERY_RATE = 14
/** Zufällige Streuung pro Schuss in Grad — ohne sie wäre das Muster auswendig lernbar. */
const JITTER_DEG = 0.30
/** So viele Einschläge bleiben höchstens sichtbar. */
export const MAX_HOLES = 120

/** Anteil der Einschläge innerhalb des Kreises, in Prozent. */
export function grouping(distances: number[]): number {
  if (!distances.length) return 0
  const inside = distances.filter((d) => d < SPRAY_RADIUS).length
  return Math.round((inside / distances.length) * 100)
}

/** Wertet das geleerte Magazin und stößt das Nachladen an. */
function finish(g: GameState): void {
  const cur: number[] = g.data.cur
  if (!cur.length) return
  const score = grouping(cur)
  g.data.sprays.push({ score, avg: avg(cur) })
  g.data.reloadAt = g.t + RELOAD_DELAY
  g.hits += cur.filter((d) => d < SPRAY_RADIUS).length
  g.score = Math.round(avg(g.data.sprays.map((s: { score: number }) => s.score)))
  pushFx(g, 'center', `${score} %`, score >= GOOD_SCORE ? 'good' : 'warn')
  play(g, score >= GOOD_SCORE ? 'go' : 'tick')
}

export const spray: ModeDef = {
  id: 'spray',
  name: 'Spray Control',
  cat: 'spray',
  skill: 'Recoil',
  core: true,
  desc: 'Volles Magazin auf eine Wand, 15 m. Das Muster ist dem echten nachempfunden — gewertet wird, wie eng deine Einschläge um den Punkt liegen.',
  hint: 'Maustaste halten · Rückstoß nach unten ausgleichen · R lädt nach',
  hold: true,
  ammoHud: true,
  extraLabel: 'Sprays',
  metricName: 'Ø %',
  start(g) {
    g.holes = []
    g.targets = []
    g.data.idx = 0
    g.data.next = 0
    g.data.sprays = []
    g.data.cur = []
    g.data.reloadAt = 0
    g.data.ammo = WEAPONS[g.settings.weapon].mag
  },
  tick(g, input, dt) {
    const w = WEAPONS[g.settings.weapon]
    if (g.data.reloadAt && g.t >= g.data.reloadAt) {
      g.data.reloadAt = 0
      spray.reload?.(g)
    }

    if (!input.mouseDown || g.data.ammo <= 0) {
      // Ohne Feuer läuft das Muster zurück an den Anfang.
      g.data.next = 0
      // idx bleibt bewusst gebrochen: nur so ist die Erholungsrate bildratenunabhaengig.
      g.data.idx = Math.max(0, g.data.idx - dt * RECOVERY_RATE)
      if (g.data.idx < 0.5) g.data.idx = 0
      return
    }

    // Restzeit wird aufgebraucht und je Schuss wieder aufgefüllt statt absolut
    // gesetzt: nur so bleibt die reale Feuerrate bei jeder Schrittweite rps.
    // Ein Tick darf deshalb mehrere Schüsse abgeben.
    g.data.next -= dt
    while (g.data.next <= 0 && input.mouseDown && g.data.ammo > 0) {
      g.data.next += 1 / w.rps

      const p = w.pat[Math.min(Math.floor(g.data.idx), w.pat.length - 1)]
      const jx = (g.rng() - 0.5) * JITTER_DEG
      const jy = (g.rng() - 0.5) * JITTER_DEG
      const d = dirFrom(g.camera.yaw + (p[0] + jx) * DEG, g.camera.pitch + (p[1] + jy) * DEG)
      const tt = (SPRAY_WALL_Z - g.player.z) / d.z
      if (tt > 0) {
        const ix = g.player.x + d.x * tt
        const iy = g.player.y + d.y * tt
        const dist = Math.hypot(ix - SPRAY_AIM.x, iy - SPRAY_AIM.y)
        g.holes.push({ x: ix, y: iy, d: dist })
        g.data.cur.push(dist)
        if (g.holes.length > MAX_HOLES) g.holes.shift()
      }
      g.data.idx++
      g.data.ammo--
      g.shots++
      play(g, 'shot')
      if (g.data.ammo <= 0) finish(g)
    }
  },
  reload(g) {
    g.data.ammo = WEAPONS[g.settings.weapon].mag
    g.data.idx = 0
    g.data.cur = []
    g.holes = []
    play(g, 'tick')
  },
  hudExtra: (g) => g.data.sprays.length,
  stats(g) {
    const all: number[] = g.data.sprays.map((s: { score: number }) => s.score)
    const spread: number[] = g.data.sprays.map((s: { avg: number }) => s.avg)
    return [
      ['Ø Gruppierung', `${all.length ? Math.round(avg(all)) : 0} %`],
      ['Bester Spray', `${all.length ? Math.max(...all) : 0} %`],
      ['Ø Abweichung', `${g.holes.length ? (avg(spread) * 100).toFixed(1) : '0'} cm`],
      ['Magazine', g.data.sprays.length],
    ]
  },
  metric: (g) => g.score,
}
