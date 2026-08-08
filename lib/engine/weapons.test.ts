import { describe, it, expect } from 'vitest'
import { WEAPONS } from './weapons'

describe('WEAPONS', () => {
  it('kennt Vandal und Phantom', () => {
    expect(Object.keys(WEAPONS).sort()).toEqual(['phantom', 'vandal'])
  })

  it('gibt jedem Muster genau so viele Schuesse wie das Magazin fasst', () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.pat.length).toBe(w.mag)
    }
  })

  it('startet jedes Muster im Ursprung', () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.pat[0]).toEqual([0, 0])
    }
  })

  it('steigt vertikal streng monoton — der Rueckstoss geht nie zurueck', () => {
    for (const w of Object.values(WEAPONS)) {
      for (let i = 1; i < w.pat.length; i++) {
        expect(w.pat[i][1]).toBeGreaterThan(w.pat[i - 1][1])
      }
    }
  })

  it('hat beim Vandal ein hoeheres Magazin-Ende als beim Phantom', () => {
    const vandalTop = WEAPONS.vandal.pat[WEAPONS.vandal.pat.length - 1][1]
    const phantomTop = WEAPONS.phantom.pat[WEAPONS.phantom.pat.length - 1][1]
    expect(vandalTop).toBeGreaterThan(phantomTop)
  })

  it('feuert Phantom schneller als Vandal', () => {
    expect(WEAPONS.phantom.rps).toBeGreaterThan(WEAPONS.vandal.rps)
  })
})
