export function avg(a: number[]): number {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0
}

/** Anteil in Prozent als Zahl. 0 statt Division durch null. */
export function pcNum(a: number, b: number): number {
  return b > 0 ? (a / b) * 100 : 0
}

/** Anteil in Prozent als Anzeigetext, "–" wenn nichts gemessen wurde. */
export function pc(a: number, b: number): string {
  return b > 0 ? `${Math.round((a / b) * 100)} %` : '–'
}

/** Millisekunden als Anzeigetext, "–" wenn kein gültiger Wert vorliegt. */
export function ms(v: number): string {
  return v > 0 ? `${Math.round(v)} ms` : '–'
}
