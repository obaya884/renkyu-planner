import { buildRestCalendar } from '@/domain/calendar/restDays'
import { findCandidates } from '@/domain/candidates/findCandidates'
import { type CandidateGroup, groupCandidates } from '@/domain/candidates/groupCandidates'
import type { HolidayData } from '@/domain/holidays/importCsv'
import type { IsoDate } from '@/domain/shared/date'

/** N-04。ビルドした年の 1 月 1 日から、翌年末と confirmedUntil の早いほうまで。設定なし（土日と祝日だけ） */
export function staticCandidateGroups(data: HolidayData, buildDay: IsoDate): CandidateGroup[] {
  const year = Number(buildDay.slice(0, 4))
  const start = `${year}-01-01`
  const nextYearEnd = `${year + 1}-12-31`
  const end = nextYearEnd < data.confirmedUntil ? nextYearEnd : data.confirmedUntil
  const cal = buildRestCalendar({ holidays: data.holidays, companyHolidays: [], entries: [] })
  const candidates = findCandidates({
    cal,
    entryDates: new Set(),
    today: start,
    start,
    end,
    confirmedUntil: data.confirmedUntil,
  })
  return groupCandidates(candidates)
}
