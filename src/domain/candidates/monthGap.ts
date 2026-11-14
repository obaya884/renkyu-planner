import type { RestCalendar } from '@/domain/calendar/restDays'
import { type IsoDate, addDays, eachDay, monthEnd, monthStart, weekday } from '@/domain/shared/date'
import type { Entry } from '@/domain/types'

export type MonthGap = Readonly<{ month: IsoDate; unconfirmed: boolean; options: readonly IsoDate[] }>

/** R-8・R-9: 月〜金に祝日も会社の休日もない月の、休み候補の金曜と月曜。選べる日が 1 つもない月は返さない */
export function monthGaps(input: {
  cal: RestCalendar
  entries: readonly Entry[]
  today: IsoDate
  start: IsoDate
  end: IsoDate
  confirmedUntil: IsoDate
}): MonthGap[] {
  const { cal, entries, today, start, end, confirmedUntil } = input
  const entryDates = new Set(entries.map((e) => e.date))
  const gaps: MonthGap[] = []

  for (let month = monthStart(start); month <= end; month = addDays(monthEnd(month), 1)) {
    const last = monthEnd(month)
    if (last < today) continue
    const days = eachDay(month, last)
    const hasWeekdayRest = days.some((d) => {
      const w = weekday(d)
      const kind = cal.kindOf(d)
      return w >= 1 && w <= 5 && (kind === 'holiday' || kind === 'company')
    })
    if (hasWeekdayRest) continue
    if (entries.some((e) => e.amount.unit === 'day' && e.date >= month && e.date <= last)) continue
    const options = days.filter((d) => {
      const w = weekday(d)
      return (w === 5 || w === 1) && d >= today && !cal.isRest(d) && !entryDates.has(d)
    })
    if (options.length === 0) continue
    gaps.push({ month, unconfirmed: last > confirmedUntil, options })
  }
  return gaps
}
