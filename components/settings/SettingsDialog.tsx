'use client'

import type { ReactNode } from 'react'
import { CrosshairPreview } from './CrosshairPreview'
import { useSettings } from './SettingsProvider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cm360, edpi } from '@/lib/engine/sens'
import type { WeaponId } from '@/lib/engine/types'
import { WEAPONS } from '@/lib/engine/weapons'
import { LIMITS } from '@/lib/store/settings'

/** Base UI meldet je nach Reglerart eine Zahl oder ein Array. */
const eins = (v: number | readonly number[]): number => (Array.isArray(v) ? v[0] : (v as number))

function Zeile({ label, wert, children }: { label: string; wert?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-2 py-2">
      <Label className="justify-between">
        <span>{label}</span>
        {wert !== undefined && <span className="text-muted-foreground tabular-nums">{wert}</span>}
      </Label>
      {children}
    </div>
  )
}

function Regler({
  label,
  wert,
  value,
  grenzen,
  step,
  onChange,
}: {
  label: string
  wert: ReactNode
  value: number
  grenzen: readonly [number, number]
  step: number
  onChange(v: number): void
}) {
  return (
    <Zeile label={label} wert={wert}>
      <Slider
        value={[value]}
        min={grenzen[0]}
        max={grenzen[1]}
        step={step}
        onValueChange={(v) => onChange(eins(v))}
      />
    </Zeile>
  )
}

function Schalter({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange(v: boolean): void
}) {
  return (
    <Label className="justify-between py-2">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </Label>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange(open: boolean): void
}) {
  const { settings: s, crosshair: x, setSettings, setCrosshair, resetBest, resetRuns } = useSettings()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Einstellungen</DialogTitle>
          <DialogDescription>
            Änderungen gelten sofort und überleben den Reload. Eine laufende Runde behält die
            Werte, mit denen sie gestartet ist.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="maus">
          <TabsList className="w-full">
            <TabsTrigger value="maus">Maus</TabsTrigger>
            <TabsTrigger value="spiel">Spiel</TabsTrigger>
            <TabsTrigger value="crosshair">Crosshair</TabsTrigger>
          </TabsList>

          <TabsContent value="maus">
            <Regler
              label="Sensitivity"
              wert={s.sens.toFixed(3)}
              value={s.sens}
              grenzen={LIMITS.sens}
              step={0.005}
              onChange={(sens) => setSettings({ sens })}
            />
            <Zeile label="Maus-DPI">
              {/* Unkontrolliert und erst beim Verlassen übernommen: ein
                  kontrolliertes Zahlenfeld würde jede Zwischeneingabe sofort
                  auf die Grenzen klemmen und beim Tippen zurückspringen. */}
              <Input
                type="number"
                min={LIMITS.dpi[0]}
                max={LIMITS.dpi[1]}
                step={50}
                defaultValue={s.dpi}
                onBlur={(e) => {
                  const roh = Number(e.target.value)
                  const dpi = Number.isFinite(roh)
                    ? Math.min(LIMITS.dpi[1], Math.max(LIMITS.dpi[0], roh))
                    : s.dpi
                  e.target.value = String(dpi)
                  setSettings({ dpi })
                }}
              />
            </Zeile>
            <p className="pt-2 text-sm text-muted-foreground tabular-nums">
              eDPI <b className="text-foreground">{Math.round(edpi(s.sens, s.dpi))}</b> ·{' '}
              <b className="text-foreground">{cm360(s.sens, s.dpi).toFixed(1)}</b> cm/360
            </p>
          </TabsContent>

          <TabsContent value="spiel">
            <Regler
              label="Rundenlänge"
              wert={`${Math.round(s.dur)} s`}
              value={s.dur}
              grenzen={LIMITS.dur}
              step={5}
              onChange={(dur) => setSettings({ dur })}
            />
            <Regler
              label="Zielgröße"
              wert={`${Math.round(s.sizeMul * 100)} %`}
              value={s.sizeMul}
              grenzen={LIMITS.sizeMul}
              step={0.05}
              onChange={(sizeMul) => setSettings({ sizeMul })}
            />
            <Zeile label="Waffe">
              <Select
                value={s.weapon}
                onValueChange={(weapon) => setSettings({ weapon: weapon as WeaponId })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: WeaponId) => WEAPONS[v].name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(WEAPONS) as WeaponId[]).map((id) => (
                    <SelectItem key={id} value={id}>
                      {WEAPONS[id].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Zeile>
            <Schalter
              label="Sound"
              checked={s.sound}
              onChange={(sound) => setSettings({ sound })}
            />
          </TabsContent>

          <TabsContent value="crosshair">
            <div className="grid gap-4">
              <div>
                <Zeile label="Farbe">
                  <input
                    type="color"
                    value={x.color}
                    onChange={(e) => setCrosshair({ color: e.target.value })}
                    className="h-8 w-full rounded-lg border border-input bg-transparent"
                  />
                </Zeile>
                <Regler
                  label="Gap"
                  wert={x.gap}
                  value={x.gap}
                  grenzen={LIMITS.gap}
                  step={1}
                  onChange={(gap) => setCrosshair({ gap })}
                />
                <Regler
                  label="Länge"
                  wert={x.len}
                  value={x.len}
                  grenzen={LIMITS.len}
                  step={1}
                  onChange={(len) => setCrosshair({ len })}
                />
                <Regler
                  label="Dicke"
                  wert={x.thick}
                  value={x.thick}
                  grenzen={LIMITS.thick}
                  step={1}
                  onChange={(thick) => setCrosshair({ thick })}
                />
              </div>
              <div className="grid content-start gap-2">
                <CrosshairPreview cfg={x} />
                <Schalter
                  label="Mittelpunkt"
                  checked={x.dot}
                  onChange={(dot) => setCrosshair({ dot })}
                />
                <Schalter
                  label="Kontur"
                  checked={x.outline}
                  onChange={(outline) => setCrosshair({ outline })}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />
        {/* Zwei Knöpfe statt eines gemeinsamen: Bestwerte und Verlauf sind für
            den Spielenden nicht dasselbe. */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            onClick={() => {
              // Rückfrage, weil der Schritt nicht umkehrbar ist.
              if (window.confirm('Alle Bestwerte löschen? Das lässt sich nicht rückgängig machen.')) {
                resetBest()
              }
            }}
          >
            Bestwerte löschen
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (window.confirm('Den ganzen Verlauf löschen? Die Bestwerte bleiben stehen.')) {
                resetRuns()
              }
            }}
          >
            Verlauf löschen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
