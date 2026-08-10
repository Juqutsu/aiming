'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { MeshStandardMaterial, SphereGeometry, type Mesh } from 'three'
import type { GameState } from '@/lib/engine/types'

/** Target Switching stellt sechs Ziele auf, Gridshot drei — acht ist reichlich. */
const POOL = 8

/**
 * Ein fester Vorrat an Kugeln, der jeden Frame aus dem Zustand nachgeführt wird.
 *
 * Die Ziel-Liste der Engine wird bei jedem Treffer neu besetzt; Meshes daran zu
 * knüpfen hieße, sie ständig neu zu erzeugen. Stattdessen bleibt der Vorrat
 * stehen und wird nur ein- und ausgeblendet.
 */
export function Targets({ gameRef }: { gameRef: RefObject<GameState | null> }) {
  const meshes = useRef<(Mesh | null)[]>([])

  // Eine Geometrie und ein Material fuer alle acht Kugeln. R3F legt je
  // JSX-Element eine eigene Instanz an — geteilt wird nur, was einmal hier
  // entsteht und als Prop durchgereicht wird. Radius 1, die Groesse macht scale.
  const geo = useMemo(() => new SphereGeometry(1, 28, 18), [])
  const mat = useMemo(() => new MeshStandardMaterial({
    color: '#ff4655',
    emissive: '#ff4655',
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.05,
  }), [])

  // Selbst erzeugte Ressourcen raeumt R3F nicht ab.
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])

  useFrame(() => {
    const g = gameRef.current
    if (!g) return
    for (let i = 0; i < POOL; i++) {
      const m = meshes.current[i]
      if (!m) continue
      const t = g.targets[i]
      const show = !!t && !t.dead && !t.hidden
      m.visible = show
      if (!show || !t) continue
      m.position.set(t.x, t.y, -t.z)
      m.scale.setScalar(t.r)
    }
  })

  return (
    <>
      {Array.from({ length: POOL }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshes.current[i] = el }}
          geometry={geo}
          material={mat}
          visible={false}
        />
      ))}
    </>
  )
}
