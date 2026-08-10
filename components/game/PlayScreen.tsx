'use client'

import { Canvas } from '@react-three/fiber'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { GameLoop } from './GameLoop'
import { Range } from './Range'
import { SprayWall } from './SprayWall'
import { Targets } from './Targets'
import { Crosshair } from '@/components/hud/Crosshair'
import { FxLayer, type FxHandle } from '@/components/hud/FxLayer'
import { Hud, type HudHandle } from '@/components/hud/Hud'
import { PauseOverlay } from '@/components/hud/PauseOverlay'
import { Results } from '@/components/hud/Results'
import { createGame, DEFAULT_SETTINGS } from '@/lib/engine/game'
import { MODES } from '@/lib/engine/modes'
import { VFOV_DEG } from '@/lib/engine/sens'
import type { GameState, Input, ModeId } from '@/lib/engine/types'
import { createInput } from '@/lib/view/input'
import { resumeAudio } from '@/lib/view/sfx'

/** Der Wert des Originals: nah genug, dass nichts vor der Nase verschwindet. */
const NEAR = 0.06

export default function PlayScreen({ modeId }: { modeId: ModeId }) {
  const mode = MODES[modeId]
  const router = useRouter()
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<GameState | null>(null)
  const inputRef = useRef<Input | null>(null)
  const frozenRef = useRef(true)
  const hudRef = useRef<HudHandle | null>(null)
  const fxRef = useRef<FxHandle | null>(null)
  // Merkt sich, ob in diesem Lauf schon gebunden wurde — unterscheidet
  // „Bereit“ (vor dem ersten Lock) von „Pausiert“ (danach).
  const startedRef = useRef(false)
  const started = startedRef.current

  // WebGL und Pointer Lock gibt es nur im Browser; vor der Montage wird nichts
  // gerendert, damit der Server keinen Zustand mit Zufallszahlen aufbaut.
  const [mounted, setMounted] = useState(false)
  const [webgl, setWebgl] = useState(true)
  const [locked, setLocked] = useState(false)
  const [over, setOver] = useState(false)
  /** Erzwingt eine frische Runde bei „Nochmal“: neuer Key, neuer Canvas. */
  const [runId, setRunId] = useState(0)

  useEffect(() => {
    setMounted(true)
    setWebgl(!!document.createElement('canvas').getContext('webgl2'))
  }, [])

  useEffect(() => {
    if (!mounted) return
    gameRef.current = createGame(mode, DEFAULT_SETTINGS)
    startedRef.current = false
    const host = hostRef.current
    if (!host) return
    const ctl = createInput({
      el: host,
      game: () => gameRef.current,
      frozen: () => frozenRef.current,
      onLock: (l) => {
        setLocked(l)
        if (l) {
          startedRef.current = true
          resumeAudio()
        }
      },
    })
    inputRef.current = ctl.input
    return () => {
      ctl.dispose()
      inputRef.current = null
    }
  }, [mounted, mode, runId])

  frozenRef.current = !locked || over

  if (!mounted) return <div id="gameRoot" />
  if (!webgl) {
    return (
      <div className="webglfail">
        <p>
          Dieser Browser stellt kein WebGL bereit. Aktiviere die
          Hardwarebeschleunigung in den Browser-Einstellungen und lade die Seite neu.
        </p>
      </div>
    )
  }

  return (
    <div id="gameRoot" ref={hostRef}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ fov: VFOV_DEG, near: NEAR, far: 220 }}
      >
        <GameLoop
          key={runId}
          gameRef={gameRef}
          inputRef={inputRef}
          frozenRef={frozenRef}
          hudRef={hudRef}
          fxRef={fxRef}
          onOver={() => {
            setOver(true)
            document.exitPointerLock()
          }}
        />
        <Range cover={mode.id === 'peek'} />
        <Targets gameRef={gameRef} />
        {mode.id === 'spray' && <SprayWall gameRef={gameRef} />}
      </Canvas>
      <Hud handleRef={hudRef} meters={!!mode.meters} />
      <FxLayer handleRef={fxRef} />
      <Crosshair />
      {over && gameRef.current && (
        <Results
          game={gameRef.current}
          onAgain={() => {
            // Muss hier stehen und nicht nur im Erzeugungs-Effekt: der Effekt
            // laeuft erst nach dem Render, den dieser Klick ausloest, und ein
            // Ref-Schreibzugriff loest selbst keinen weiteren Render aus.
            startedRef.current = false
            setOver(false)
            setRunId((n) => n + 1)
          }}
          onMenu={() => router.push('/')}
        />
      )}
      {!over && !locked && (
        <PauseOverlay
          title={started ? 'Pausiert' : 'Bereit'}
          text={started
            ? 'Klick, um weiterzumachen. Esc pausiert.'
            : 'Klick, um die Maus zu binden. Esc pausiert.'}
          onResume={() => { void hostRef.current?.requestPointerLock() }}
          onQuit={() => router.push('/')}
        />
      )}
    </div>
  )
}
