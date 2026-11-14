import { type IsoDate, addDays } from '../shared/date'
import type { Quarter } from '../quarters/quarters'
import { type PlannerInput, restCalendarOf } from './input'

/**
 * 画面定義書 §5.2: 「日を足す」の日付の初期値。開いている四半期の中の、今日以降で最も早い平日
 * （土日・祝日・会社の休日でない日）。過ぎた四半期では、その四半期の最後の平日
 */
export function defaultDayFor(input: PlannerInput, quarter: Quarter): IsoDate {
  const cal = restCalendarOf(input)
  const isWeekday = (d: IsoDate) => {
    const kind = cal.kindOf(d)
    return kind !== 'weekend' && kind !== 'holiday' && kind !== 'company'
  }
  const past = quarter.end < input.today
  const first = quarter.start > input.today ? quarter.start : input.today
  if (past) {
    for (let d = quarter.end; d >= quarter.start; d = addDays(d, -1)) if (isWeekday(d)) return d
    return quarter.end
  }
  for (let d = first; d <= quarter.end; d = addDays(d, 1)) if (isWeekday(d)) return d
  return first
}
