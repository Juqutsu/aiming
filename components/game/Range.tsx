'use client'

import { PEEK_COVER } from '@/lib/engine/modes/peek'
import { tz } from '@/lib/view/coords'

/** Kante der Rückwand in Engine-Metern, wie im Original. */
const WALL_Z = 34
const WALL_W = 52
const WALL_H = 7

export function Range({ cover }: { cover?: boolean }) {
  const c = PEEK_COVER
  return (
    <>
      <color attach="background" args={['#0d151c']} />
      <ambientLight intensity={0.6} />
      {/* Rimlight von schräg oben — gibt den Kugeln ihre Kante. */}
      <directionalLight position={[8, 14, 6]} intensity={1.15} />

      {/* Boden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#0d151c" />
      </mesh>
      {/* Raster im Zwei-Meter-Takt, genau wie das gezeichnete Raster des Originals. */}
      <gridHelper args={[96, 48, '#607c96', '#607c96']} position={[0, 0.02, 0]}>
        <lineBasicMaterial attach="material" color="#607c96" transparent opacity={0.18} />
      </gridHelper>

      {/* Rückwand */}
      <mesh position={[0, WALL_H / 2, tz(WALL_Z)]}>
        <planeGeometry args={[WALL_W, WALL_H]} />
        <meshStandardMaterial color="#1a2833" />
      </mesh>

      {cover && (
        <mesh position={[(c.x1 + c.x2) / 2, c.h / 2, tz(c.z)]}>
          <boxGeometry args={[c.x2 - c.x1, c.h, 0.4]} />
          <meshStandardMaterial color="#26333f" />
        </mesh>
      )}
    </>
  )
}
