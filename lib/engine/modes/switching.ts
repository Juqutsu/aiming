import { avg, ms, pc } from '../format'
import { play, pushFx, registerMiss } from '../game'
import { rayHitBest } from '../math'
import { slotTarget } from '../spawn'
import type { GameState, ModeDef } from '../types'

/** Stellt einen frischen Satz von sechs Zielen auf und startet die Zeitmessung neu. */
function newSet(g: GameState): void {
  g.targets = []
  for (let i = 0; i < 6; i++) {
    g.targets.push(slotTarget(g, 0.3 * g.settings.sizeMul, 5.0, 1.0, 3.2, 16))
  }
  g.data.setStart = g.t
}

export const switching: ModeDef = {
  id: 'switching',
  name: 'Target Switching',
  cat: 'aim',
  skill: 'Zielwechsel',
  desc: 'Sechs Ziele, alle müssen weg, dann kommt der nächste Satz. Misst die Zeit zwischen zwei Kills — genau das, was Multi-Kills entscheidet.',
  hint: 'Alle sechs Ziele leeren',
  metricName: 'Kills',
  start(g) {
    newSet(g)
  },
  tick() {},
  fire(g) {
    g.shots++
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (!t) {
      registerMiss(g)
      return
    }
    t.dead = true
    g.hits++
    g.streak++
    g.bestStreak = Math.max(g.bestStreak, g.streak)
    g.score++
    // Gemessen wird der Abstand zum vorigen Kill, nicht die Standzeit des Ziels:
    // im Duell zählt genau diese Lücke zwischen zwei Gegnern.
    const last = g.data.lastKill ?? g.data.setStart
    g.ttk.push((g.t - last) * 1000)
    g.data.lastKill = g.t
    pushFx(g, { x: t.x, y: t.y, z: t.z }, '+1', 'good')
    play(g, 'hit')
    if (g.targets.every((x) => x.dead)) {
      newSet(g)
      g.data.lastKill = g.t
      play(g, 'go')
    }
  },
  stats: (g) => [
    ['Kills', g.score],
    ['Accuracy', pc(g.hits, g.shots)],
    ['Ø Wechsel', ms(avg(g.ttk))],
    ['Bester Wechsel', ms(Math.min(...(g.ttk.length ? g.ttk : [0])))],
  ],
  metric: (g) => g.score,
}
