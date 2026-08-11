import { describe, expect, it } from 'vitest'
import { DEFAULT_CROSSHAIR } from '@/lib/crosshair/draw'
import { DEFAULT_SETTINGS } from '@/lib/engine/game'
import { KEY, type Store } from './keys'
import { LIMITS, loadCrosshair, loadSettings, saveCrosshair, saveSettings } from './settings'

function fakeStore(seed: Record<string, string> = {}): Store & { map: Map<string, string> } {
  const map = new Map(Object.entries(seed))
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: (k) => { map.delete(k) },
  }
}

describe('loadSettings', () => {
  it('liefert bei leerem Speicher die Standardwerte', () => {
    expect(loadSettings(fakeStore())).toEqual(DEFAULT_SETTINGS)
  })

  it('gibt zurueck, was gespeichert wurde', () => {
    const store = fakeStore()
    const eigene = { sens: 0.4, dpi: 1600, dur: 30, sizeMul: 1.5, weapon: 'phantom' as const, sound: false }
    saveSettings(store, eigene)
    expect(loadSettings(store)).toEqual(eigene)
  })

  it('faellt bei kaputtem JSON auf die Standardwerte zurueck, ohne zu werfen', () => {
    const store = fakeStore({ [KEY.settings]: '{nicht json' })
    expect(() => loadSettings(store)).not.toThrow()
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS)
  })

  it('ersetzt falsche Typen feldweise durch die Standardwerte', () => {
    const store = fakeStore({
      [KEY.settings]: JSON.stringify({ sens: 'schnell', dpi: null, weapon: 'ak47', sound: 'ja' }),
    })
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS)
  })

  it('behaelt gueltige Felder, wenn nur einzelne verdorben sind', () => {
    const store = fakeStore({ [KEY.settings]: JSON.stringify({ sens: 0.4, dpi: 'viel' }) })
    const s = loadSettings(store)
    expect(s.sens).toBe(0.4)
    expect(s.dpi).toBe(DEFAULT_SETTINGS.dpi)
  })

  it('klemmt Zahlen ausserhalb der Grenzen, statt sie zu verwerfen', () => {
    const store = fakeStore({ [KEY.settings]: JSON.stringify({ sens: 999, dur: 2 }) })
    const s = loadSettings(store)
    expect(s.sens).toBe(LIMITS.sens[1])
    expect(s.dur).toBe(LIMITS.dur[0])
  })

  it('akzeptiert bei weapon nur vandal und phantom', () => {
    const vandal = fakeStore({ [KEY.settings]: JSON.stringify({ weapon: 'vandal' }) })
    const phantom = fakeStore({ [KEY.settings]: JSON.stringify({ weapon: 'phantom' }) })
    const unfug = fakeStore({ [KEY.settings]: JSON.stringify({ weapon: 'operator' }) })
    expect(loadSettings(vandal).weapon).toBe('vandal')
    expect(loadSettings(phantom).weapon).toBe('phantom')
    expect(loadSettings(unfug).weapon).toBe(DEFAULT_SETTINGS.weapon)
  })

  it('schreibt unter dem Einstellungs-Schluessel und ruehrt das Crosshair nicht an', () => {
    const store = fakeStore()
    saveSettings(store, DEFAULT_SETTINGS)
    expect(store.map.has(KEY.settings)).toBe(true)
    expect(store.map.has(KEY.crosshair)).toBe(false)
  })
})

describe('loadCrosshair', () => {
  it('liefert bei leerem Speicher die Standardwerte', () => {
    expect(loadCrosshair(fakeStore())).toEqual(DEFAULT_CROSSHAIR)
  })

  it('gibt zurueck, was gespeichert wurde', () => {
    const store = fakeStore()
    const eigene = { color: '#ff0080', gap: 8, len: 12, thick: 4, dot: true, outline: false }
    saveCrosshair(store, eigene)
    expect(loadCrosshair(store)).toEqual(eigene)
  })

  it('faellt bei kaputtem JSON auf die Standardwerte zurueck', () => {
    const store = fakeStore({ [KEY.crosshair]: '{nicht json' })
    expect(loadCrosshair(store)).toEqual(DEFAULT_CROSSHAIR)
  })

  it('akzeptiert nur #rrggbb als Farbe', () => {
    const gut = fakeStore({ [KEY.crosshair]: JSON.stringify({ color: '#FF00AA' }) })
    const kurz = fakeStore({ [KEY.crosshair]: JSON.stringify({ color: '#f0a' }) })
    const wort = fakeStore({ [KEY.crosshair]: JSON.stringify({ color: 'rot' }) })
    expect(loadCrosshair(gut).color).toBe('#FF00AA')
    expect(loadCrosshair(kurz).color).toBe(DEFAULT_CROSSHAIR.color)
    expect(loadCrosshair(wort).color).toBe(DEFAULT_CROSSHAIR.color)
  })

  it('verlangt bei dot und outline echte Booleans', () => {
    const store = fakeStore({ [KEY.crosshair]: JSON.stringify({ dot: 1, outline: 'nein' }) })
    const c = loadCrosshair(store)
    expect(c.dot).toBe(DEFAULT_CROSSHAIR.dot)
    expect(c.outline).toBe(DEFAULT_CROSSHAIR.outline)
  })

  it('klemmt die drei Zahlen an die Reglergrenzen', () => {
    const store = fakeStore({ [KEY.crosshair]: JSON.stringify({ gap: 99, len: -5, thick: 42 }) })
    const c = loadCrosshair(store)
    expect(c.gap).toBe(LIMITS.gap[1])
    expect(c.len).toBe(LIMITS.len[0])
    expect(c.thick).toBe(LIMITS.thick[1])
  })

  it('schreibt unter dem Crosshair-Schluessel und ruehrt die Einstellungen nicht an', () => {
    const store = fakeStore()
    saveCrosshair(store, DEFAULT_CROSSHAIR)
    expect(store.map.has(KEY.crosshair)).toBe(true)
    expect(store.map.has(KEY.settings)).toBe(false)
  })
})
