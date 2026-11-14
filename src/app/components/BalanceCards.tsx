import { T, balanceDetail, fiveDaysText, formatAmount, remainingLabel, usablePeriod } from '@/app/texts'
import type { BalanceCard, SummaryView } from '@/domain/view/summary'

function Card({ card, workMinutes }: { card: BalanceCard; workMinutes: number }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg bg-card px-3 py-2">
      <div className="text-sm text-sub">{remainingLabel(card.name)}</div>
      <div className="text-xl font-bold">{formatAmount(card.remaining, workMinutes)}</div>
      <div className={`text-sm ${card.short ? 'font-bold text-warn-ink' : 'text-sub'}`}>
        {balanceDetail(card.planned, card.unassigned, card.short, workMinutes)}
        {card.usable !== null && <span className="ml-2">{usablePeriod(card.usable.start, card.usable.end)}</span>}
        {card.usable !== null && card.remaining <= 0 && <span className="ml-2">{T.usedUp}</span>}
      </div>
    </div>
  )
}

/** §3.2。付与日が無ければ何も描かない（F-106）。不足は警告の色で出す */
export function BalanceCards({ summary, workMinutes }: { summary: SummaryView; workMinutes: number }) {
  if (summary.state === 'unset') return null
  const { fiveDays } = summary
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto">
        {summary.cards.map((card) => (
          <div key={card.leaveTypeId} className={`flex ${summary.cards.length >= 3 ? 'w-[45%] shrink-0' : 'min-w-0 flex-1'}`}>
            <Card card={card} workMinutes={workMinutes} />
          </div>
        ))}
      </div>
      {fiveDays !== null && (
        <p className={`mt-1 text-sm ${fiveDays.warn ? 'text-warn-ink' : 'text-sub'}`}>
          {fiveDaysText(fiveDays.remainingDays, fiveDays.doneDays, fiveDays.plannedDays)}
        </p>
      )}
    </div>
  )
}
