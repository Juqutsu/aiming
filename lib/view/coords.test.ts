import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { basis, createCamera } from '@/lib/engine/camera'
import { dirFrom } from '@/lib/engine/math'
import { camEuler, project, toThree, tz } from './coords'

const WIDTH = 800
const HEIGHT = 600

/** Ein paar Winkel quer über den erlaubten Bereich, inklusive Rückwärtsblick. */
const ANGLES: [number, number][] = [
  [0, 0], [0.7, 0.3], [-2.1, -0.5], [Math.PI, 0.9], [3.9, -1.2],
]

function threeCam(yaw: number, pitch: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera()
  cam.rotation.order = 'YXZ'
  const e = camEuler(yaw, pitch)
  cam.rotation.set(e[0], e[1], e[2])
  cam.updateMatrixWorld()
  return cam
}

describe('toThree', () => {
  it('spiegelt die z-Achse und lässt x und y unberührt', () => {
    expect(toThree({ x: 1, y: 2, z: 3 })).toEqual([1, 2, -3])
    expect(tz(15)).toBe(-15)
  })
})

describe('camEuler', () => {
  it('richtet die Three-Kamera auf dieselbe Richtung wie die Engine', () => {
    for (const [yaw, pitch] of ANGLES) {
      const f = new THREE.Vector3()
      threeCam(yaw, pitch).getWorldDirection(f)
      const want = toThree(dirFrom(yaw, pitch))
      expect(f.x).toBeCloseTo(want[0], 6)
      expect(f.y).toBeCloseTo(want[1], 6)
      expect(f.z).toBeCloseTo(want[2], 6)
    }
  })

  it('hält den Rechtsvektor ungespiegelt — sonst liefe Strafen im Bild verkehrt', () => {
    for (const [yaw, pitch] of ANGLES) {
      const cam = threeCam(yaw, pitch)
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion)
      const e = createCamera()
      e.yaw = yaw
      e.pitch = pitch
      basis(e)
      const want = toThree(e.R)
      expect(right.x).toBeCloseTo(want[0], 6)
      expect(right.y).toBeCloseTo(want[1], 6)
      expect(right.z).toBeCloseTo(want[2], 6)
    }
  })
})

describe('project', () => {
  it('bildet einen Punkt geradeaus auf die Bildmitte ab', () => {
    const cam = threeCam(0, 0)
    const p = project({ x: 0, y: 0, z: 5 }, cam, WIDTH, HEIGHT)
    expect(p).not.toBeNull()
    expect(p!.x).toBeCloseTo(WIDTH / 2, 6)
    expect(p!.y).toBeCloseTo(HEIGHT / 2, 6)
  })

  it('bildet einen Punkt über der Blickachse auf ein kleineres y ab — Bildschirm-y wächst nach unten', () => {
    const cam = threeCam(0, 0)
    const p = project({ x: 0, y: 1, z: 5 }, cam, WIDTH, HEIGHT)
    expect(p).not.toBeNull()
    expect(p!.y).toBeLessThan(HEIGHT / 2)
  })

  it('liefert null für einen Punkt hinter der Kamera', () => {
    const cam = threeCam(0, 0)
    const p = project({ x: 0, y: 0, z: -5 }, cam, WIDTH, HEIGHT)
    expect(p).toBeNull()
  })
})
