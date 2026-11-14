import { WEEKDAY_NAMES, monthCaption } from '@/app/texts'
import type { DayCell, DayMark, MonthView } from '@/domain/view/quarterView'

/** 色と形の両方で分ける（§3.6、§7）。取得済みは塗り、予定は枠、候補は枠と薄い地、休みは薄い地 */
export const MARK_CLASS: Readonly<Record<DayMark, string>> = {
  done: 'bg-primary font-bold text-white',
  planned: 'border-2 border-primary font-bold',
  candidate: 'border-2 border-dashed border-candidate-line bg-candidate-bg',
  company: 'bg-company-bg text-company-ink',
  off: 'bg-rest-bg text-rest-ink',
}

function Cell({ cell }: { cell: DayCell | null }) {
  if (cell === null) return <td />
  const classes = [
    'mx-auto flex aspect-square w-full max-w-[18px] items-center justify-center rounded-sm text-[11px] leading-none',
    cell.mark === null ? '' : MARK_CLASS[cell.mark],
    cell.grantDay ? 'outline outline-2 outline-offset-1 outline-long-line' : '',
  ]
  return (
    <td>
      <span
        className={classes.join(' ')}
        data-mark={cell.mark ?? undefined}
        data-grant-day={cell.grantDay ? '' : undefined}
      >
        {cell.day}
      </span>
    </td>
  )
}

/** §3.6。日曜始まりの 1 か月。日付のマスは押せない。印は data-mark に持つ */
export function MonthCalendar({ month }: { month: MonthView }) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-y-0.5 text-center">
      <caption className="mb-1 text-left text-sm font-bold">{monthCaption(month.month)}</caption>
      <thead>
        <tr>
          {WEEKDAY_NAMES.map((w) => (
            <th key={w} className="text-[11px] font-normal text-sub">
              {w}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {month.weeks.map((week, i) => (
          <tr key={i}>
            {week.map((cell, j) => (
              <Cell key={j} cell={cell} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
