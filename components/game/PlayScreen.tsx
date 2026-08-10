'use client'

import { Canvas } from '@react-three/fiber'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
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

/** Client-Status ändert sich nach der Hydration nie wieder — es gibt nichts zu abonnieren. */
const noopSubscribe = () => () => {}

/** Einmal pro Seitenleben geprüft: WebGL-Unterstützung ändert sich nicht zur Laufzeit. */
let webglCache: boolean | null = null
function hasWebgl(): boolean {
  if (webglCache === null) {
    webglCache = !!document.createElement('canvas').getContext('webgl2')
  }
  return webglCache
}

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
  // startedRef wird stets zusammen mit einem setState geschrieben (onLock, onAgain),
  // das ohnehin neu rendert; der Lesewert ist zum Renderzeitpunkt also nie
  // veralteter als der zuletzt committete.
  // eslint-disable-next-line react-hooks/refs -- s.o.
  const started = startedRef.current
  // Spiegelt `over` für Stellen, die keine frische React-Closure auf den State haben —
  // der onLock-Rückruf unten wird nur bei mounted/mode/runId neu gebaut, nicht bei jedem
  // `over`-Wechsel, würde also sonst einen veralteten Wert einfangen.
  const overRef = useRef(false)

  // WebGL und Pointer Lock gibt es nur im Browser; vor der Montage wird nichts
  // gerendert, damit der Server keinen Zustand mit Zufallszahlen aufbaut.
  // useSyncExternalStore statt State+Effekt: der Client-Wert steht bei der
  // Hydration bereits fest, ein setState im Effekt wäre nur eine unnötige
  // zweite Rendrunde für denselben Übergang.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const webgl = useSyncExternalStore(noopSubscribe, hasWebgl, () => true)
  const [locked, setLocked] = useState(false)
  const [over, setOver] = useState(false)
  /** Erzwingt bei „Nochmal“ einen frischen `GameLoop`: neuer Key, neue Montage.
   *  Canvas, Targets, SprayWall, Hud und FxLayer bleiben dieselbe Instanz —
   *  nur die Bildschleife selbst startet neu. */
  const [runId, setRunId] = useState(0)

  useEffect(() => {
    if (!mounted) return
    gameRef.current = createGame(mode, DEFAULT_SETTINGS)
    startedRef.current = false
    overRef.current = false
    const host = hostRef.current
    if (!host) return
    const ctl = createInput({
      el: host,
      game: () => gameRef.current,
      frozen: () => frozenRef.current,
      onLock: (l) => {
        setLocked(l)
        // Synchron, nicht per Render-Body: die Bildschleife und der Input-Host
        // lesen frozenRef unabhängig vom React-Zyklus und müssen sofort den
        // richtigen Wert sehen, nicht erst nach dem nächsten Commit.
        frozenRef.current = !l || overRef.current
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
            overRef.current = true
            frozenRef.current = true
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
      {/* gameRef ändert sich nicht mehr, sobald `over` steht: tick() läuft dann
          nirgends mehr, der Lesezugriff hier ist sicher, auch wenn der Compiler
          das nicht prüfen kann. */}
      {/* eslint-disable-next-line react-hooks/refs -- s.o. */}
      {over && gameRef.current && (
        <Results
          // eslint-disable-next-line react-hooks/refs -- derselbe sichere Zugriff wie oben
          game={gameRef.current}
          onAgain={() => {
            // Synchron und vor den beiden set*-Aufrufen: R3F haengt useFrame
            // schon in der Layout-Phase ein, gameRef.current wird aber erst im
            // passiven Effekt neu besetzt. Landet ein Frame des frischen
            // GameLoop (reported=false) in dieser Luecke, saehe es sonst noch
            // das alte, bereits fertige Spiel (g.over) und meldete sofort
            // wieder Ende — GameLoop und Targets brechen bei null sauber ab.
            gameRef.current = null
            startedRef.current = false
            overRef.current = false
            frozenRef.current = true
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
          onResume={() => {
            // Host-Listener feuert für Overlay-Klicks nicht (siehe PauseOverlay),
            // hier trotzdem denselben Schutz wie dort: eine abgelehnte
            // Pointer-Lock-Anfrage darf nicht als unhandled rejection auffallen.
            void hostRef.current?.requestPointerLock().catch(() => {})
          }}
          onQuit={() => router.push('/')}
        />
      )}
    </div>
  )
}
