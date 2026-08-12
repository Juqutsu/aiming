const W = 96
const H = 24
const P = 3

/**
 * Die Kurve der letzten Läufe, ohne Achsen und ohne Beschriftung.
 *
 * Unter drei Punkten bleibt die Fläche leer und behält ihre Höhe: eine Linie
 * aus zwei Punkten ist keine Aussage, und ein springendes Raster ist unruhig.
 */
export function Sparkline({ values, best, label }: {
  values: number[]
  /** Index des besten Werts, aus `bestIndex()`. -1 wenn es keinen gibt. */
  best: number
  label: string
}) {
  if (values.length < 3) return <svg width={W} height={H} aria-hidden="true" />

  const lo = Math.min(...values)
  const hi = Math.max(...values)
  // Eine waagerechte Reihe hat keine Spanne — ohne diesen Ersatz teilten wir durch null.
  const spanne = hi - lo || 1
  const x = (i: number) => P + (i * (W - P * 2)) / (values.length - 1)
  const y = (v: number) => H - P - ((v - lo) / spanne) * (H - P * 2)

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <polyline
        fill="none"
        stroke="var(--text)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
      />
      {best >= 0 && (
        <circle cx={x(best)} cy={y(values[best])} r="2.5" fill="var(--sig)"
          stroke="var(--surface)" strokeWidth="1.5" />
      )}
    </svg>
  )
}
