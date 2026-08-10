import { describe, expect, it } from 'vitest'
import { DEFAULT_CROSSHAIR, drawCrosshair } from './draw'

type Call = { op: string; args: number[] }

/** Ein Aufzeichnungs-Kontext: er merkt sich nur, was gezeichnet wurde. */
function fakeCtx() {
  const calls: Call[] = []
  const rec = (op: string) => (...args: number[]) => { calls.push({ op, args }) }
  const ctx = {
    calls,
    strokeStyle: '', fillStyle: '', lineWidth: 0, lineCap: '' as CanvasLineCap,
    beginPath: rec('beginPath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    stroke: rec('stroke'),
    arc: rec('arc'),
    fill: rec('fill'),
  }
  return ctx
}

const draw = (cfg: Partial<typeof DEFAULT_CROSSHAIR>) => {
  const ctx = fakeCtx()
  drawCrosshair(
    ctx as unknown as CanvasRenderingContext2D,
    100, 50,
    { ...DEFAULT_CROSSHAIR, ...cfg },
  )
  return ctx
}

const count = (ctx: ReturnType<typeof fakeCtx>, op: string) =>
  ctx.calls.filter((c) => c.op === op).length

describe('drawCrosshair', () => {
  it('zeichnet vier Striche, mit Kontur zweimal', () => {
    const withOutline = draw({ outline: true, dot: false })
    expect(count(withOutline, 'moveTo')).toBe(8)
    expect(count(withOutline, 'stroke')).toBe(2)

    const plain = draw({ outline: false, dot: false })
    expect(count(plain, 'moveTo')).toBe(4)
    expect(count(plain, 'stroke')).toBe(1)
  })

  it('setzt die Striche auf Gap-Abstand und Gap plus Länge', () => {
    const ctx = draw({ outline: false, dot: false, gap: 3, len: 6 })
    // Nur die Strichbefehle: beginPath und stroke stehen dazwischen.
    const segs = ctx.calls.filter((c) => c.op === 'moveTo' || c.op === 'lineTo')
    expect(segs[0]).toEqual({ op: 'moveTo', args: [100, 47] })
    expect(segs[1]).toEqual({ op: 'lineTo', args: [100, 41] })
  })

  it('lässt bei Länge 0 die Striche weg, zeichnet den Punkt aber weiter', () => {
    const ctx = draw({ outline: false, dot: true, len: 0 })
    expect(count(ctx, 'stroke')).toBe(0)
    expect(count(ctx, 'arc')).toBe(1)
    expect(count(ctx, 'fill')).toBe(1)
  })

  it('zeichnet ohne Punkt keinen Kreis', () => {
    expect(count(draw({ dot: false, outline: false }), 'arc')).toBe(0)
  })
})
