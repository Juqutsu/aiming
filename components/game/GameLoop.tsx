'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { FxHandle } from '@/components/hud/FxLayer'
import type { HudHandle } from '@/components/hud/Hud'
import { MAX_DT, tick } from '@/lib/engine/game'
import { speed } from '@/lib/engine/math'
import type { GameState, Input } from '@/lib/engine/types'
import { camEuler, project, toThree } from '@/lib/view/coords'
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
 * `useFrame` bekommt hier eine negative Priorität. R3F sortiert seine
 * Rückrufe gleicher Priorität nach Montage-Reihenfolge, aber ein Neustart
 * hängt nur `GameLoop` neu ein (siehe `key={runId}` in PlayScreen) — seine
 * Subscription würde ab dem zweiten Lauf hinter `Targets` und `SprayWall`
 * landen, die dann mit dem Zustand vom letzten Frame statt dem aktuellen
 * zeichnen. Negative Priorität sortiert garantiert vor 0 und läuft dabei
 * nicht in R3Fs manuellen Render-Modus, den erst Priorität > 0 auslöst.
 */
export function GameLoop({ gameRef, inputRef, frozenRef, hudRef, fxRef, onOver }: GameLoopProps) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const reported = useRef(false)
  const sinceSnap = useRef(0)

  // R3F startet seine Bildschleife bereits in der Layout-Phase; ein passives
  // useEffect könnte erst nach dem ersten Frame committen.
  useLayoutEffect(() => {
    // R3F gibt hier absichtlich das mutierbare Three-Kamera-Objekt zurück;
    // es zu mutieren ist der Zweck dieser Schleife, kein Compiler-Fehler.
    // eslint-disable-next-line react-hooks/immutability -- s.o.
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
    camera.position.set(...toThree(g.player))
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
        const p = project(f.at, camera, size.width, size.height)
        if (!p) continue
        fx.spawn(f.text, f.kind, p.x, p.y)
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
        // Nur bei laufender Runde neu bilden: pausiert soll der Schnappschuss
        // sofort stimmen, sobald es weitergeht — nach dem Ende gibt es dahinter
        // aber nichts mehr zu sehen, das zehnmal pro Sekunde neu gezeichnet werden müsste.
        if (!g.over) hud.set(snapshot(g))
      }
    }
  }, -1)

  return null
}
