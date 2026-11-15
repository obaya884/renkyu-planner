import { T, balanceDetail, extraLeaveLine, fiveDaysText, formatAmount, remainingLabel, usablePeriod } from '@/app/texts'
import { PAID_LEAVE_TYPE_ID } from '@/domain/types'
import type { IsoDate } from '@/domain/shared/date'
import type { BalanceCard, SummaryView } from '@/domain/view/summary'

function ExtraLine({ card, workMinutes }: { card: BalanceCard; workMinutes: number }) {
  return (
    <li className={`text-sm ${card.short && !card.usedUp ? 'font-bold text-warn-ink' : 'text-sub'}`}>
      {extraLeaveLine(card.name, card.remaining, card.unassigned, card.short, card.usedUp, workMinutes)}
      {card.usable !== null && <span className="ml-2">{usablePeriod(card.usable.start, card.usable.end)}</span>}
    </li>
  )
}

/** §3.2。付与日が無ければ何も描かない（F-106）。有休は 1 枚のカード（年 5 日の行と新しい付与年の知らせを含む）、足した休暇は 1 行ずつ。不足は警告の色で出す */
export function BalanceCards({
  summary,
  workMinutes,
  onConfirmNewYear,
}: {
  summary: SummaryView
  workMinutes: number
  onConfirmNewYear: (grantYearStart: IsoDate) => void
}) {
  if (summary.state === 'unset') return null
  const { fiveDays } = summary
  const paid = summary.cards.find((c) => c.leaveTypeId === PAID_LEAVE_TYPE_ID)
  const extras = summary.cards.filter((c) => c.leaveTypeId !== PAID_LEAVE_TYPE_ID)
  return (
    <div>
      {paid !== undefined && (
        <div data-testid="paid-card" className="rounded-lg bg-card px-3 py-2">
          <div className="text-sm text-sub">{remainingLabel(paid.name)}</div>
          <div className="text-xl font-bold">{formatAmount(paid.remaining, workMinutes)}</div>
          <div className={`text-sm ${paid.short ? 'font-bold text-warn-ink' : 'text-sub'}`}>
            {balanceDetail(paid.planned, paid.unassigned, paid.short, workMinutes)}
            {paid.usable !== null && <span className="ml-2">{usablePeriod(paid.usable.start, paid.usable.end)}</span>}
            {paid.usedUp && <span className="ml-2">{T.usedUp}</span>}
          </div>
          {summary.newGrantYearStart !== null && (
            <button
              type="button"
              className="mt-1 min-h-11 text-left text-sm font-bold text-primary underline"
              onClick={() => onConfirmNewYear(summary.newGrantYearStart as IsoDate)}
            >
              {T.newGrantYear}
            </button>
          )}
          {fiveDays !== null && (
            <p className={`mt-1 text-sm ${fiveDays.warn ? 'text-warn-ink' : 'text-sub'}`}>
              {fiveDaysText(fiveDays.remainingDays, fiveDays.doneDays, fiveDays.plannedDays)}
            </p>
          )}
        </div>
      )}
      {extras.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1 px-1">
          {extras.map((card) => (
            <ExtraLine key={card.leaveTypeId} card={card} workMinutes={workMinutes} />
          ))}
        </ul>
      )}
    </div>
  )
}
