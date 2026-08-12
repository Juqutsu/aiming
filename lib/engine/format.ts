const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

/** Ein Zeitstempel als kurzes deutsches Datum, lokale Zeit, z. B. "11. Aug". */
export function shortDate(t: number): string {
  const d = new Date(t)
  return `${d.getDate()}. ${MONATE[d.getMonth()]}`
}

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
