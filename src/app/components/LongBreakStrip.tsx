import { T, longBreakChip } from '@/app/texts'
import type { SummaryView } from '@/domain/view/summary'

/** §3.3。今日が入る四半期から 4 つ。札は押せない */
export function LongBreakStrip({ summary }: { summary: SummaryView }) {
  return (
    <div>
      <div className="text-sm text-sub">
        {summary.holidaysOnly ? T.longBreak + T.longBreakHolidaysOnly : T.longBreak}
      </div>
      <ul className="mt-1 flex flex-wrap gap-1">
        {summary.longBreaks.map(({ quarter, has }) => (
          <li
            key={quarter.start}
            className={`rounded-full px-2 py-0.5 text-sm ${has ? 'bg-has-bg text-has-ink' : 'bg-warn-bg text-warn-ink'}`}
          >
            {longBreakChip(quarter.start, has)}
          </li>
        ))}
      </ul>
    </div>
  )
}
