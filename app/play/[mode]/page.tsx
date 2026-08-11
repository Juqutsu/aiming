import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import PlayScreen from '@/components/game/PlayScreen'
import { MODES } from '@/lib/engine/modes'
import type { ModeId } from '@/lib/engine/types'

export default async function Page({ params }: PageProps<'/play/[mode]'>) {
  const { mode } = await params
  if (!(mode in MODES)) notFound()
  // `useSearchParams` in einer Client-Komponente braucht unter dem App Router
  // eine Suspense-Grenze; der Platzhalter ist derselbe leere Wirt, den
  // PlayScreen vor der Montage rendert.
  return (
    <Suspense fallback={<div id="gameRoot" />}>
      <PlayScreen modeId={mode as ModeId} />
    </Suspense>
  )
}
