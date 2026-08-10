import Link from 'next/link'
import { MODE_LIST } from '@/lib/engine/modes'
import { cm360, edpi } from '@/lib/engine/sens'
import { DEFAULT_SETTINGS } from '@/lib/engine/game'
import type { ModeDef } from '@/lib/engine/types'

const GROUPS: [ModeDef['cat'], string][] = [
  ['aim', 'Aim'],
  ['spray', 'Recoil'],
  ['move', 'Movement'],
]

export default function Home() {
  const s = DEFAULT_SETTINGS
  return (
    <div className="screen">
      <div className="wrap">
        <header className="brand">
          <div>
            <div className="logo">RA<em>N</em>GE</div>
            <div className="tag">Aim &amp; Movement Trainer</div>
          </div>
          <div className="sensbadge">
            Sens <b>{s.sens}</b> · <b>{s.dpi}</b> DPI · eDPI <b>{edpi(s.sens, s.dpi)}</b><br />
            <b>{cm360(s.sens, s.dpi).toFixed(1)}</b> cm/360 · FOV 103 (Hor+)
          </div>
        </header>

        {GROUPS.map(([cat, title]) => (
          <section key={cat}>
            <div className="eyebrow">{title}</div>
            <div className="grid">
              {MODE_LIST.filter((m) => m.cat === cat).map((m) => (
                <Link className="card cut" key={m.id} href={`/play/${m.id}`}>
                  <span className={`skill${m.core ? ' core' : ''}`}>{m.skill}</span>
                  <h3>{m.name}</h3>
                  <p>{m.desc}</p>
                  <div className="best"><span>{m.metricName}</span><b>—</b></div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <div className="foot">
          Einstellungen, Bestwerte und Routinen kommen in der nächsten Phase.
        </div>
      </div>
    </div>
  )
}
