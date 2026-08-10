'use client'

import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { GameLoop } from './GameLoop'
import { Range } from './Range'
import { Targets } from './Targets'
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
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<GameState | null>(null)
  const inputRef = useRef<Input | null>(null)
  const frozenRef = useRef(true)

  // WebGL und Pointer Lock gibt es nur im Browser; vor der Montage wird nichts
  // gerendert, damit der Server keinen Zustand mit Zufallszahlen aufbaut.
  const [mounted, setMounted] = useState(false)
  const [locked, setLocked] = useState(false)
  const [over, setOver] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    gameRef.current = createGame(mode, DEFAULT_SETTINGS)
    const host = hostRef.current
    if (!host) return
    const ctl = createInput({
      el: host,
      game: () => gameRef.current,
      frozen: () => frozenRef.current,
      onLock: (l) => {
        setLocked(l)
        if (l) resumeAudio()
      },
    })
    inputRef.current = ctl.input
    return () => {
      ctl.dispose()
      inputRef.current = null
    }
  }, [mounted, mode])

  frozenRef.current = !locked || over

  if (!mounted) return <div id="gameRoot" />

  return (
    <div id="gameRoot" ref={hostRef}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ fov: VFOV_DEG, near: NEAR, far: 220 }}
      >
        <GameLoop
          gameRef={gameRef}
          inputRef={inputRef}
          frozenRef={frozenRef}
          onOver={() => {
            setOver(true)
            document.exitPointerLock()
          }}
        />
        <Range cover={mode.id === 'peek'} />
        <Targets gameRef={gameRef} />
      </Canvas>
    </div>
  )
}
