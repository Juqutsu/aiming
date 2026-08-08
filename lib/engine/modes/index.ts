import type { ModeDef, ModeId } from '../types'
import { counterstrafe } from './counterstrafe'
import { flick } from './flick'
import { gridshot } from './gridshot'
import { micro } from './micro'
import { peek } from './peek'
import { reaction } from './reaction'
import { spray } from './spray'
import { strafeshoot } from './strafeshoot'
import { strafetrack } from './strafetrack'
import { switching } from './switching'
import { tracking } from './tracking'

/** Reihenfolge bestimmt die Anzeige im Menü: erst Aim, dann Recoil, dann Movement. */
export const MODE_LIST: ModeDef[] = [
  gridshot, flick, micro, switching, tracking, strafetrack, reaction,
  spray,
  counterstrafe, peek, strafeshoot,
]

export const MODES = Object.fromEntries(
  MODE_LIST.map((m) => [m.id, m]),
) as Record<ModeId, ModeDef>
