import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import PlayScreen from '@/components/game/PlayScreen'
import { MODES } from '@/lib/engine/modes'
import type { ModeId } from '@/lib/engine/types'

export default async function Page({ params, searchParams }: PageProps<'/play/[mode]'>) {
  const { mode } = await params
  if (!(mode in MODES)) notFound()
  const sp = await searchParams
  // Der Schlüssel erzwingt beim Wechsel der Station eine frische Montage. Ohne
  // ihn behielte eine Routine, die zweimal denselben Modus enthält, den
  // Ergebnis-Schirm der vorigen Station.
  const key = `${mode}:${sp.routine ?? ''}:${sp.step ?? ''}`
  // `useSearchParams` in einer Client-Komponente braucht unter dem App Router
  // eine Suspense-Grenze; der Platzhalter ist derselbe leere Wirt, den
  // PlayScreen vor der Montage rendert.
  return (
    <Suspense fallback={<div id="gameRoot" />}>
      <PlayScreen key={key} modeId={mode as ModeId} />
    </Suspense>
  )
}
