import { pcNum } from '../format'
import { rayHitBest } from '../math'
import type { ModeDef } from '../types'

const LIMIT_X = 6.5
const GRAVITY = 9.8

export const strafetrack: ModeDef = {
  id: 'strafetrack',
  name: 'Strafe Tracking',
  cat: 'aim',
  skill: 'Tracking',
  core: true,
  desc: 'Das Ziel strafed wie ein echter Gegner: harte Richtungswechsel, wechselndes Tempo, gelegentliche Sprünge. Der realistischste Aim-Modus hier.',
  hint: 'Maustaste halten · Richtungswechsel lesen, nicht raten',
  hold: true,
  metricName: 'On-Target %',
  start(g) {
    g.targets = [{
      x: 0, y: 1.7, z: 13, r: 0.4 * g.settings.sizeMul, dead: false, born: 0,
      dir: 1, spd: 4.2, next: 0, vy: 0, base: 1.7,
    }]
  },
  tick(g, input, dt) {
    const t = g.targets[0]
    t.next = (t.next ?? 0) - dt
    if (t.next <= 0) {
      // Richtung, Tempo und Dauer neu würfeln — das macht die Bewegung
      // unvorhersehbar, ohne sie unfair ruckartig werden zu lassen.
      t.dir = g.rng() < 0.5 ? -1 : 1
      t.spd = 3.2 + g.rng() * 3.6
      t.next = 0.22 + g.rng() * 0.75
      if (g.rng() < 0.22 && t.y <= (t.base as number) + 0.01) t.vy = 3.6
    }
    t.x += (t.dir as number) * (t.spd as number) * dt
    if (t.x > LIMIT_X) { t.x = LIMIT_X; t.dir = -1 }
    if (t.x < -LIMIT_X) { t.x = -LIMIT_X; t.dir = 1 }
    t.vy = (t.vy ?? 0) - GRAVITY * dt
    t.y += t.vy * dt
    if (t.y < (t.base as number)) { t.y = t.base as number; t.vy = 0 }
    if (input.mouseDown) {
      g.trackTotal += dt
      if (rayHitBest(g.player, g.camera.F, g.targets)) {
        g.trackTime += dt
        g.score = Math.round(g.trackTime * 10)
      }
    }
  },
  stats: (g) => [
    ['Zeit auf Ziel', `${g.trackTime.toFixed(1)} s`],
    ['Trefferquote', `${pcNum(g.trackTime, g.trackTotal).toFixed(0)} %`],
    ['Feuerzeit', `${g.trackTotal.toFixed(1)} s`],
  ],
  metric: (g) => Math.round(pcNum(g.trackTime, g.trackTotal)),
}
