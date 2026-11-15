import { summaryLine } from '@/app/texts'
import { PAID_LEAVE_TYPE_ID } from '@/domain/types'
import type { SummaryView } from '@/domain/view/summary'

/**
 * §3.4・§4 の持ち分の 1 行。有休だけ。設定なしなら何も描かない。
 * 出し入れで下の内容が押し下がらないよう、流れの外（fixed）に高さ h-7（28px）で置く。
 * その下に張り付くもの（スマホのタブ、PC の節の見出し）は、出ているあいだ BELOW_SUMMARY_* の分だけ下げる
 */
export function StickySummary({ summary, workMinutes }: { summary: SummaryView; workMinutes: number }) {
  const card = summary.cards.find((c) => c.leaveTypeId === PAID_LEAVE_TYPE_ID)
  if (summary.state === 'unset' || card === undefined) return null
  return (
    <div className="fixed inset-x-0 top-0 z-30 h-7 bg-white shadow-sm">
      <p className={`mx-auto max-w-[960px] truncate px-4 text-sm leading-7 ${card.short ? 'font-bold text-warn-ink' : ''}`}>
        {summaryLine(card.name, card.remaining, card.unassigned, card.short, workMinutes)}
      </p>
    </div>
  )
}

/** 1 行の高さ（h-7）と同じだけ下げる。スマホのタブの段 */
export const BELOW_SUMMARY_TOP = 'top-7'
/** 同じく、PC の節の見出し */
export const BELOW_SUMMARY_TOP_LG = 'lg:top-7'
