import type { HolidayData } from '../holidays/importCsv'
import { type IsoDate, addDays, weekday } from '../shared/date'
import type { CompanyHoliday, Entry } from '../types'

export type RestKind = 'weekend' | 'holiday' | 'company' | 'leave'

export type RestCalendar = Readonly<{
  kindOf(d: IsoDate): RestKind | null
  isRest(d: IsoDate): boolean
}>

export type Run = Readonly<{ start: IsoDate; end: IsoDate; days: number }>

function inCompanyHoliday(h: CompanyHoliday, d: IsoDate): boolean {
  if (h.kind === 'once') return h.start <= d && d <= h.end
  const md = d.slice(5)
  // 開始月日が終了月日より後なら年をまたぐ（R-15）
  return h.start <= h.end ? h.start <= md && md <= h.end : md >= h.start || md <= h.end
}

/** 休みの日の種類。重なったときは leave > company > holiday > weekend（R-1） */
export function buildRestCalendar(input: {
  holidays: HolidayData['holidays']
  companyHolidays: readonly CompanyHoliday[]
  entries: readonly Entry[]
}): RestCalendar {
  const leaveDays = new Set(input.entries.filter((e) => e.amount.unit === 'day').map((e) => e.date))
  const kindOf = (d: IsoDate): RestKind | null => {
    if (leaveDays.has(d)) return 'leave'
    if (input.companyHolidays.some((h) => inCompanyHoliday(h, d))) return 'company'
    if (d in input.holidays) return 'holiday'
    const w = weekday(d)
    return w === 0 || w === 6 ? 'weekend' : null
  }
  return { kindOf, isRest: (d) => kindOf(d) !== null }
}

/** d を含む休みの並びを、両側に伸ばして返す。d が休みの日でなければ null */
function runAround(cal: RestCalendar, d: IsoDate): Run | null {
  if (!cal.isRest(d)) return null
  let start = d
  while (cal.isRest(addDays(start, -1))) start = addDays(start, -1)
  let end = d
  while (cal.isRest(addDays(end, 1))) end = addDays(end, 1)
  return { start, end, days: daysBetween(start, end) }
}

function daysBetween(start: IsoDate, end: IsoDate): number {
  let n = 1
  for (let d = start; d < end; d = addDays(d, 1)) n++
  return n
}

/** start〜end に 1 日でもかかる 3 日以上の連休を、期間の外まで伸ばして開始日の早い順に返す（R-2） */
export function restRuns(cal: RestCalendar, start: IsoDate, end: IsoDate): Run[] {
  const runs: Run[] = []
  let d = start
  while (d <= end) {
    const run = runAround(cal, d)
    if (run === null) {
      d = addDays(d, 1)
      continue
    }
    if (run.days >= 3) runs.push(run)
    d = addDays(run.end, 1)
  }
  return runs
}

/** d が 3 日以上の連休に入っていればその連休（F-304） */
export function runContaining(cal: RestCalendar, d: IsoDate): Run | null {
  const run = runAround(cal, d)
  return run !== null && run.days >= 3 ? run : null
}
