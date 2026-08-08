export type Vec3 = { x: number; y: number; z: number }

export type WeaponId = 'vandal' | 'phantom'

export type ModeId =
  | 'gridshot' | 'flick' | 'micro' | 'switching'
  | 'tracking' | 'strafetrack' | 'reaction'
  | 'spray'
  | 'counterstrafe' | 'peek' | 'strafeshoot'

export type Target = {
  x: number
  y: number
  z: number
  r: number
  dead: boolean
  born: number
  /** Vom Modus versteckt — weder sichtbar noch treffbar. */
  hidden?: boolean
  /** Bahnphase für Smooth Tracking. */
  ph?: number
  /** Strafe-Richtung, Tempo, Restzeit bis zum Richtungswechsel. */
  dir?: number
  spd?: number
  next?: number
  /** Vertikale Geschwindigkeit und Standhöhe für springende Ziele. */
  vy?: number
  base?: number
}

export type Player = { x: number; y: number; z: number; vx: number; vz: number }

export type Camera = {
  yaw: number
  pitch: number
  /** Orthonormale Basis, von basis() aus yaw/pitch berechnet. */
  F: Vec3
  R: Vec3
  U: Vec3
}

export type Settings = {
  sens: number
  dpi: number
  dur: number
  /** Multiplikator auf alle Zielradien. 1.0 = Standard. */
  sizeMul: number
  weapon: WeaponId
  sound: boolean
}

export type Input = {
  keys: Record<string, boolean>
  mouseDown: boolean
}

export type SoundId = 'hit' | 'head' | 'miss' | 'go' | 'bad' | 'tick' | 'shot'

/** Ein Treffer-Feedback. Die Ansicht projiziert `at` und wählt die Farbe zu `kind`. */
export type Fx = {
  at: Vec3 | 'center'
  text: string
  kind: 'good' | 'bad' | 'warn'
}

/** Ein Einschlag auf der Spray-Wand. `d` ist der Abstand zum Zielpunkt in Metern. */
export type Hole = { x: number; y: number; d: number }

export type StatRow = [string, string | number]

export type GameState = {
  mode: ModeDef
  dur: number
  /** Verstrichene Sekunden seit Rundenbeginn. */
  t: number
  /** Verbleibende Sekunden. */
  left: number
  score: number
  hits: number
  shots: number
  streak: number
  bestStreak: number
  /** Zeit vom Erscheinen bis zum Treffer, in Millisekunden. */
  ttk: number[]
  /** Reaktionszeiten in Millisekunden. */
  react: number[]
  targets: Target[]
  holes: Hole[]
  /** Modus-eigener Zustand. Jeder Modus besitzt seine eigenen Schlüssel. */
  data: Record<string, any>
  /** Sekunden auf dem Ziel bzw. Sekunden mit gedrückter Taste. */
  trackTime: number
  trackTotal: number
  over: boolean
  /** Großer Hinweis in der Bildmitte, z. B. die Strafe-Richtung. */
  cue: string | null
  /** Seit dem letzten Frame entstandene Effekte. Die Ansicht leert die Liste. */
  fx: Fx[]
  /** Seit dem letzten Frame angeforderte Töne. Die Ansicht leert die Liste. */
  sounds: SoundId[]
  player: Player
  camera: Camera
  settings: Settings
  rng: () => number
}

export type ModeDef = {
  id: ModeId
  name: string
  cat: 'aim' | 'spray' | 'move'
  skill: string
  core?: boolean
  desc: string
  hint: string
  /** Gefeuert wird durch Halten der Taste, nicht durch Klick. */
  hold?: boolean
  /** WASD bewegt den Spieler. */
  move?: boolean
  /** Tempo- und Exposure-Balken einblenden. */
  meters?: boolean
  /** Munitionsanzeige einblenden. */
  ammoHud?: boolean
  /** Beschriftung des vierten HUD-Felds. Default: "Streak". */
  extraLabel?: string
  /** Bei true ist ein kleinerer Metrikwert besser. */
  lowerBetter?: boolean
  metricName: string
  start(g: GameState): void
  tick(g: GameState, input: Input, dt: number): void
  fire?(g: GameState): void
  reload?(g: GameState): void
  hudExtra?(g: GameState): string | number
  stats(g: GameState): StatRow[]
  metric(g: GameState): number
}
