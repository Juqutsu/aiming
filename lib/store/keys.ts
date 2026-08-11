/**
 * Der Ausschnitt der Web-Storage-API, den wir wirklich brauchen.
 *
 * Als Schnittstelle statt als direkter Zugriff auf `localStorage`, damit die
 * Speicherlogik ohne Browser testbar bleibt — und damit ein Wechsel des
 * Rückens später eine Änderung an einer Stelle ist.
 */
export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** Die Version im Schlüssel erlaubt es, altes Schema später zu erkennen statt daran zu scheitern. */
export const KEY = {
  settings: 'range.settings.v1',
  crosshair: 'range.crosshair.v1',
  best: 'range.best.v1',
  session: 'range.session.v1',
} as const

/** Rohwert aus dem Speicher. Unlesbares gilt als nicht vorhanden. */
export function readJson(store: Store, key: string): unknown {
  try {
    const raw = store.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

/** Schreiben darf fehlschlagen — ein voller oder gesperrter Speicher ist kein Grund abzustürzen. */
export function writeJson(store: Store, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value))
  } catch {
    // Absichtlich still: die Einstellung gilt für diese Sitzung trotzdem.
  }
}

/** `localStorage`, oder null wenn es ihn nicht gibt (Server, blockierte Cookies). */
export function browserStore(): Store | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** `sessionStorage` für alles, was nur diese Sitzung beschreibt. */
export function sessionStore(): Store | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}
