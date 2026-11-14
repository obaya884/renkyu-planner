import { summaryLine } from '@/app/texts'
import type { SummaryView } from '@/domain/view/summary'

/** §3.4 の持ち分の 1 行。有休だけ。設定なしなら何も描かない。張り付ける位置は呼ぶ側が決める */
export function StickySummary({ summary, workMinutes }: { summary: SummaryView; workMinutes: number }) {
  const card = summary.cards.find((c) => c.leaveTypeId === 'paid')
  if (summary.state === 'unset' || card === undefined) return null
  return <p className="px-1 py-1 text-sm">{summaryLine(card.name, card.remaining, card.unassigned, card.short, workMinutes)}</p>
}
