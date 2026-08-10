import { applyMouse } from '@/lib/engine/camera'
import { fire } from '@/lib/engine/game'
import type { GameState, Input } from '@/lib/engine/types'

/** Diese Tasten scrollen sonst die Seite. */
const SWALLOW = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'])

export type InputHost = {
  /** Das Element, das den Pointer Lock hält. */
  el: HTMLElement
  /** Der laufende Zustand, oder null solange keiner existiert. */
  game: () => GameState | null
  /** True, solange nicht gespielt wird: vor dem Start, in der Pause, nach dem Lauf. */
  frozen: () => boolean
  onLock: (locked: boolean) => void
}

/**
 * Bindet Tastatur, Maus und Pointer Lock an einen Zustand.
 *
 * Mausbewegung wird sofort angewandt und nicht bis zum nächsten Frame gesammelt:
 * ein Klick, der zwischen zwei Frames fällt, muss mit der Blickrichtung von
 * genau diesem Moment auswerten. Ein Frame Verzug wäre bei Flicks spürbar.
 */
export function createInput(host: InputHost): { input: Input; dispose(): void } {
  const input: Input = { keys: {}, mouseDown: false }
  let locked = false

  const releaseAll = () => {
    for (const k in input.keys) input.keys[k] = false
    input.mouseDown = false
  }

  const onKeyDown = (e: KeyboardEvent) => {
    input.keys[e.code] = true
    if (SWALLOW.has(e.code)) e.preventDefault()
    if (e.code === 'KeyR' && !host.frozen()) {
      const g = host.game()
      if (g) g.mode.reload?.(g)
    }
  }
  const onKeyUp = (e: KeyboardEvent) => { input.keys[e.code] = false }

  const onMouseDown = (e: MouseEvent) => {
    if (!locked) {
      // Kann abgelehnt werden — dann bleibt der Pausen-Schirm einfach stehen.
      void Promise.resolve(host.el.requestPointerLock()).catch(() => {})
      return
    }
    if (e.button !== 0 || host.frozen()) return
    const g = host.game()
    if (!g) return
    input.mouseDown = true
    // Halte-Modi werten über tick aus, geklickt wird dort nicht.
    if (!g.mode.hold) fire(g)
  }
  const onMouseUp = (e: MouseEvent) => { if (e.button === 0) input.mouseDown = false }

  const onMove = (e: MouseEvent) => {
    if (!locked || host.frozen()) return
    const g = host.game()
    if (!g) return
    applyMouse(g.camera, e.movementX, e.movementY, g.settings.sens)
  }

  const onLockChange = () => {
    locked = document.pointerLockElement === host.el
    if (!locked) releaseAll()
    host.onLock(locked)
  }

  host.el.addEventListener('mousedown', onMouseDown)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('blur', releaseAll)
  document.addEventListener('pointerlockchange', onLockChange)
  document.addEventListener('mousemove', onMove)

  return {
    input,
    dispose() {
      host.el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', releaseAll)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMove)
    },
  }
}
