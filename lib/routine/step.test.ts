import { describe, expect, it } from 'vitest'
import { ROUTINES } from '@/lib/engine/routines'
import { readStep, routineHref } from './step'

const WARMUP = ROUTINES.warmup
const ERSTER = WARMUP.steps[0]
const LETZTER_INDEX = WARMUP.steps.length - 1

function params(s: string): URLSearchParams {
  return new URLSearchParams(s)
}

describe('readStep', () => {
  it('liefert Modus und Dauer aus der Routine', () => {
    const step = readStep(params('routine=warmup&step=0'), ERSTER[0])
    expect(step).not.toBeNull()
    expect(step?.modeId).toBe(ERSTER[0])
    expect(step?.dur).toBe(ERSTER[1])
    expect(step?.index).toBe(0)
    expect(step?.routine).toBe('warmup')
  })

  it('zeigt mit next auf die naechste Station', () => {
    const step = readStep(params('routine=warmup&step=0'), ERSTER[0])
    expect(step?.next?.modeId).toBe(WARMUP.steps[1][0])
    expect(step?.next?.href).toBe(routineHref('warmup', 1))
  })

  it('hat bei der letzten Station kein next', () => {
    const letzter = WARMUP.steps[LETZTER_INDEX]
    const step = readStep(params(`routine=warmup&step=${LETZTER_INDEX}`), letzter[0])
    expect(step?.next).toBeNull()
  })

  it('zaehlt im Label ab 1', () => {
    const step = readStep(params('routine=warmup&step=0'), ERSTER[0])
    expect(step?.label).toBe(`Station 1 von ${WARMUP.steps.length}`)
  })

  it('liefert null ohne Routinen-Parameter', () => {
    expect(readStep(params(''), ERSTER[0])).toBeNull()
  })

  it('liefert null bei unbekannter Routine', () => {
    expect(readStep(params('routine=quatsch&step=0'), ERSTER[0])).toBeNull()
  })

  it('liefert null bei nicht-numerischem Schritt', () => {
    expect(readStep(params('routine=warmup&step=zwei'), ERSTER[0])).toBeNull()
  })

  it('liefert null bei negativem Schritt', () => {
    expect(readStep(params('routine=warmup&step=-1'), ERSTER[0])).toBeNull()
  })

  it('liefert null bei zu grossem Schritt', () => {
    expect(readStep(params(`routine=warmup&step=${WARMUP.steps.length}`), ERSTER[0])).toBeNull()
  })

  it('liefert null, wenn der Modus in der URL nicht zur Station passt', () => {
    const fremd = WARMUP.steps[1][0]
    expect(fremd).not.toBe(ERSTER[0])
    expect(readStep(params('routine=warmup&step=0'), fremd)).toBeNull()
  })
})

describe('routineHref', () => {
  it('zeigt ohne Index auf die erste Station mit deren Modus', () => {
    expect(routineHref('warmup')).toBe(`/play/${ERSTER[0]}?routine=warmup&step=0`)
  })

  it('zeigt mit Index auf die Station mit deren Modus', () => {
    expect(routineHref('warmup', 2)).toBe(`/play/${WARMUP.steps[2][0]}?routine=warmup&step=2`)
  })
})
