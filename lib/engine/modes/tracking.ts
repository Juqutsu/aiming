import { pcNum } from '../format'
import { rayHitBest } from '../math'
import type { ModeDef } from '../types'

export const tracking: ModeDef = {
  id: 'tracking',
  name: 'Smooth Tracking',
  cat: 'aim',
  skill: 'Tracking',
  desc: 'Ein Ziel auf weicher Bahn. Halte die Maustaste gedrückt und bleib drauf — gewertet wird der Anteil der Zeit auf dem Ziel.',
  hint: 'Maustaste halten und dranbleiben',
  hold: true,
  metricName: 'On-Target %',
  start(g) {
    g.targets = [{ x: 0, y: 1.75, z: 12, r: 0.42 * g.settings.sizeMul, dead: false, born: 0, ph: 0 }]
  },
  tick(g, input, dt) {
    const t = g.targets[0]
    // Drei überlagerte Sinusse: die Bahn wiederholt sich nicht sichtbar,
    // bleibt aber weich genug, dass Führen statt Nachziehen belohnt wird.
    t.ph = (t.ph ?? 0) + dt
    t.x = Math.sin(t.ph * 0.85) * 5.2 + Math.sin(t.ph * 1.9) * 1.4
    t.y = 1.75 + Math.sin(t.ph * 1.35) * 0.55
    t.z = 12 + Math.sin(t.ph * 0.55) * 2.2
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
