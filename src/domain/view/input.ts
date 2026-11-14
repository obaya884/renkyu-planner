import { type RestCalendar, buildRestCalendar } from '../calendar/restDays'
import { grantYearOf } from '../leave/grantYear'
import type { HolidayData } from '../holidays/importCsv'
import type { IsoDate } from '../shared/date'
import type { Entry, Settings } from '../types'

export type PlannerInput = Readonly<{
  holidays: HolidayData
  settings: Settings
  entries: readonly Entry[]
  today: IsoDate
}>

export function restCalendarOf(input: PlannerInput): RestCalendar {
  return buildRestCalendar({
    holidays: input.holidays.holidays,
    companyHolidays: input.settings.companyHolidays,
    entries: input.entries,
  })
}

/** 今日が入る付与年。付与日が未設定なら null */
export function currentGrantYear(input: PlannerInput): { start: IsoDate; end: IsoDate } | null {
  const { grantDay } = input.settings
  return grantDay === null ? null : grantYearOf(input.today, grantDay)
}
