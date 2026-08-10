import type { SoundId } from '@/lib/engine/types'

let ac: AudioContext | null = null

/** Der Kontext entsteht erst beim ersten Ton — vorher darf ihn der Browser blocken. */
function ctx(): AudioContext | null {
  if (!ac) {
    try {
      ac = new AudioContext()
    } catch {
      return null
    }
  }
  return ac
}

function blip(freq: number, dur: number, type: OscillatorType, vol: number): void {
  const a = ctx()
  if (!a) return
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(vol, a.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur)
  o.connect(g)
  g.connect(a.destination)
  o.start()
  o.stop(a.currentTime + dur)
}

/** Der Schuss ist ein kurzes Rauschen mit steilem Abfall, kein Ton. */
function noise(): void {
  const a = ctx()
  if (!a) return
  const len = Math.floor(a.sampleRate * 0.06)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
  const n = a.createBufferSource()
  n.buffer = buf
  const g = a.createGain()
  g.gain.value = 0.06
  n.connect(g)
  g.connect(a.destination)
  n.start()
}

const TABLE: Record<SoundId, () => void> = {
  hit: () => blip(880, 0.06, 'square', 0.10),
  head: () => {
    blip(1320, 0.05, 'square', 0.11)
    setTimeout(() => blip(1760, 0.05, 'square', 0.08), 35)
  },
  miss: () => blip(160, 0.05, 'sawtooth', 0.05),
  go: () => blip(660, 0.09, 'triangle', 0.10),
  bad: () => blip(110, 0.22, 'sawtooth', 0.08),
  tick: () => blip(440, 0.04, 'sine', 0.05),
  shot: noise,
}

/**
 * Spielt die Warteschlange der Engine ab und leert sie.
 *
 * Das Stummschalten liegt bewusst hier: `play()` reiht Töne bedingungslos ein
 * und kennt `settings.sound` nicht. Auch stumm muss die Liste geleert werden,
 * sonst wächst sie über die ganze Runde.
 */
export function playQueue(queue: SoundId[], enabled: boolean): void {
  if (enabled) for (const id of queue) TABLE[id]()
  queue.length = 0
}

/** Nach einer Nutzergeste aufrufen — Browser starten den Kontext sonst suspendiert. */
export function resumeAudio(): void {
  void ctx()?.resume()
}
