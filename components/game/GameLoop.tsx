'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { MAX_DT, tick } from '@/lib/engine/game'
import type { GameState, Input } from '@/lib/engine/types'
import { camEuler } from '@/lib/view/coords'
import { playQueue } from '@/lib/view/sfx'

export type GameLoopProps = {
  gameRef: RefObject<GameState | null>
  inputRef: RefObject<Input | null>
  /** True, solange nicht simuliert werden darf: vor dem Start, in der Pause, nach dem Lauf. */
  frozenRef: RefObject<boolean>
  onOver: () => void
}

/**
 * Die einzige Stelle, an der der Spielzustand voranschreitet.
 *
 * Sie muss das erste Kind im Canvas sein: R3F ruft `useFrame`-Rückrufe gleicher
 * Priorität in der Reihenfolge ihrer Montage auf, und alle anderen Komponenten
 * lesen den Zustand, den diese Schleife gerade geschrieben hat.
 */
export function GameLoop({ gameRef, inputRef, frozenRef, onOver }: GameLoopProps) {
  const camera = useThree((s) => s.camera)
  const reported = useRef(false)

  useEffect(() => {
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
  })

  return null
}
