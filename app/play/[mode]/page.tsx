import { notFound } from 'next/navigation'
import PlayScreen from '@/components/game/PlayScreen'
import { MODES } from '@/lib/engine/modes'
import type { ModeId } from '@/lib/engine/types'

export default async function Page({ params }: PageProps<'/play/[mode]'>) {
  const { mode } = await params
  if (!(mode in MODES)) notFound()
  return <PlayScreen modeId={mode as ModeId} />
}
