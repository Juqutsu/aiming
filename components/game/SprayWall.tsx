'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'
import { MAX_HOLES, SPRAY_AIM, SPRAY_RADIUS, SPRAY_WALL_Z } from '@/lib/engine/modes/spray'
import type { GameState } from '@/lib/engine/types'
import { tz } from '@/lib/view/coords'

/** Radius eines Einschlags in Metern, wie im Original. */
const HOLE_R = 0.035
/** Einschläge und Ringe liegen knapp vor der Wand, sonst flimmern sie. */
const EPS = 0.01

const WALL_W = 18
const WALL_H = 6

export function SprayWall({ gameRef }: { gameRef: RefObject<GameState | null> }) {
  const holes = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const inside = useMemo(() => new Color('#ff6b35'), [])
  const outside = useMemo(() => new Color('#2a313c'), [])

  useFrame(() => {
    const g = gameRef.current
    const mesh = holes.current
    if (!g || !mesh) return
    for (let i = 0; i < MAX_HOLES; i++) {
      const h = g.holes[i]
      if (h) {
        dummy.position.set(h.x, h.y, tz(SPRAY_WALL_Z) + EPS * 2)
        dummy.scale.setScalar(1)
        mesh.setColorAt(i, h.d < SPRAY_RADIUS ? inside : outside)
      } else {
        // Ungenutzte Instanzen werden auf null skaliert statt versteckt —
        // InstancedMesh kennt keine Sichtbarkeit je Instanz.
        dummy.scale.setScalar(0)
      }
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <>
      <mesh position={[0, WALL_H / 2, tz(SPRAY_WALL_Z)]}>
        <planeGeometry args={[WALL_W, WALL_H]} />
        <meshStandardMaterial color="#161b22" />
      </mesh>

      {/* Der Kreis, innerhalb dessen ein Einschlag als sitzend zählt. */}
      <mesh position={[SPRAY_AIM.x, SPRAY_AIM.y, tz(SPRAY_WALL_Z) + EPS]}>
        <ringGeometry args={[SPRAY_RADIUS - 0.01, SPRAY_RADIUS, 64]} />
        <meshBasicMaterial color="#ff6b35" transparent opacity={0.55} />
      </mesh>
      {/* Ein zweiter Ring zur Orientierung, ohne Wertung. */}
      <mesh position={[SPRAY_AIM.x, SPRAY_AIM.y, tz(SPRAY_WALL_Z) + EPS]}>
        <ringGeometry args={[SPRAY_RADIUS * 2 - 0.01, SPRAY_RADIUS * 2, 64]} />
        <meshBasicMaterial color="#4a5563" transparent opacity={0.35} />
      </mesh>
      {/* Der Zielpunkt selbst. */}
      <mesh position={[SPRAY_AIM.x, SPRAY_AIM.y, tz(SPRAY_WALL_Z) + EPS * 2]}>
        <circleGeometry args={[0.03, 16]} />
        <meshBasicMaterial color="#e6e8ec" />
      </mesh>

      <instancedMesh ref={holes} args={[undefined, undefined, MAX_HOLES]}>
        <circleGeometry args={[HOLE_R, 12]} />
        <meshBasicMaterial />
      </instancedMesh>
    </>
  )
}
