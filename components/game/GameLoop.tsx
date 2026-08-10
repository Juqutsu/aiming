'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef, type RefObject } from 'react'
import { Vector3 } from 'three'
import type { FxHandle } from '@/components/hud/FxLayer'
import type { HudHandle } from '@/components/hud/Hud'
import { MAX_DT, tick } from '@/lib/engine/game'
import { speed } from '@/lib/engine/math'
import type { GameState, Input } from '@/lib/engine/types'
import { camEuler } from '@/lib/view/coords'
import { snapshot } from '@/lib/view/hud'
import { playQueue } from '@/lib/view/sfx'

export type GameLoopProps = {
  gameRef: RefObject<GameState | null>
  inputRef: RefObject<Input | null>
  /** True, solange nicht simuliert werden darf: vor dem Start, in der Pause, nach dem Lauf. */
  frozenRef: RefObject<boolean>
  hudRef: RefObject<HudHandle | null>
  fxRef: RefObject<FxHandle | null>
  onOver: () => void
}

/**
 * Die einzige Stelle, an der der Spielzustand voranschreitet.
 *
 * Sie muss das erste Kind im Canvas sein: R3F ruft `useFrame`-Rückrufe gleicher
 * Priorität in der Reihenfolge ihrer Montage auf, und alle anderen Komponenten
 * lesen den Zustand, den diese Schleife gerade geschrieben hat.
 */
export function GameLoop({ gameRef, inputRef, frozenRef, hudRef, fxRef, onOver }: GameLoopProps) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const reported = useRef(false)
  const sinceSnap = useRef(0)
  const projected = useRef(new Vector3())

  // R3F startet seine Bildschleife bereits in der Layout-Phase; ein passives
  // useEffect könnte erst nach dem ersten Frame committen.
  useLayoutEffect(() => {
    camera.rotation.order = 'YXZ'
  }, [camera])

  useFrame((_, delta) => {
    const g = gameRef.current
    const input = inputRef.current
    if (!g || !input) return

    // Der Deckel ist Pflicht: ohne ihn degradieren nach einem Frame-Aussetzer
    // still die Bewegung, der Counterstrafe-Stopp, das Peek-Fenster und der
    // Feuertakt in Spray. Das Original klemmte an derselben Stelle.
    const dt = Math.min(delta, MAX_DT)

    if (!frozenRef.current && !g.over) {
      tick(g, input, dt)
      playQueue(g.sounds, g.settings.sound)
    } else {
      // Auch pausiert muss die Warteschlange leer bleiben.
      g.sounds.length = 0
    }

    // Die Kamera folgt immer, auch in der Pause — sonst friert das Bild schief ein.
    camera.position.set(g.player.x, g.player.y, -g.player.z)
    const e = camEuler(g.camera.yaw, g.camera.pitch)
    camera.rotation.set(e[0], e[1], e[2])

    if (g.over && !reported.current) {
      reported.current = true
      onOver()
    }

    // Effekte erst nach dem Kamera-Update projizieren, sonst hängen sie einen Frame nach.
    if (g.fx.length) {
      const fx = fxRef.current
      for (const f of g.fx) {
        if (!fx) continue
        if (f.at === 'center') {
          fx.spawn(f.text, f.kind, size.width / 2, size.height * 0.35)
          continue
        }
        const v = projected.current.set(f.at.x, f.at.y, -f.at.z).project(camera)
        // z über 1 heißt hinter der Kamera — dort gibt es keinen Bildpunkt.
        if (v.z > 1) continue
        fx.spawn(
          f.text, f.kind,
          (v.x * 0.5 + 0.5) * size.width,
          (-v.y * 0.5 + 0.5) * size.height,
        )
      }
      g.fx.length = 0
    }

    const hud = hudRef.current
    if (hud) {
      // Die Balken laufen mit voller Bildrate: bei Counterstrafe entscheidet
      // ihre Latenz darüber, ob die Übung überhaupt funktioniert.
      if (g.mode.meters) {
        hud.setMeters(
          speed(g.player),
          g.mode.id === 'peek' ? (g.data.expo ?? 0) * 1000 : null,
        )
      }
      sinceSnap.current += dt
      if (sinceSnap.current >= 0.1) {
        sinceSnap.current = 0
        hud.set(snapshot(g))
      }
    }
  })

  return null
}
