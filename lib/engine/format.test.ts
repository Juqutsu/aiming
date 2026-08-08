import { describe, it, expect } from 'vitest'
import { avg, ms, pc, pcNum } from './format'

describe('avg', () => {
  it('mittelt eine Liste', () => {
    expect(avg([1, 2, 3])).toBeCloseTo(2, 10)
  })

  it('liefert 0 fuer eine leere Liste statt NaN', () => {
    expect(avg([])).toBe(0)
  })
})

describe('pcNum', () => {
  it('rechnet einen Anteil in Prozent um', () => {
    expect(pcNum(1, 4)).toBeCloseTo(25, 10)
  })

  it('liefert 0 statt einer Division durch null', () => {
    expect(pcNum(3, 0)).toBe(0)
  })
})

describe('pc', () => {
  it('formatiert gerundet mit Prozentzeichen', () => {
    expect(pc(2, 3)).toBe('67 %')
  })

  it('zeigt einen Gedankenstrich wenn noch nichts gemessen wurde', () => {
    expect(pc(0, 0)).toBe('–')
  })
})

describe('ms', () => {
  it('formatiert gerundete Millisekunden', () => {
    expect(ms(312.4)).toBe('312 ms')
  })

  it('zeigt einen Gedankenstrich fuer 0 und negative Werte', () => {
    expect(ms(0)).toBe('–')
    expect(ms(-5)).toBe('–')
  })
})
