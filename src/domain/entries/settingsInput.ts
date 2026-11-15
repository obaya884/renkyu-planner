import { MAX_COMPANY_HOLIDAY_DAYS, companyHolidayDays, isValidMonthDay } from '../calendar/companyHoliday'
import { isValidIsoDate } from '../shared/date'
import type { CompanyHoliday } from '../types'

/** F-102: 時間（0〜24 の整数）と分（0〜59 の整数）の文字から、所定労働時間（分）に直す。どちらかが空・小数・範囲の外なら NaN */
export function workMinutesFrom(hours: string, minutes: string): number {
  if (!/^\d+$/.test(hours) || !/^\d+$/.test(minutes)) return Number.NaN
  const h = Number(hours)
  const m = Number(minutes)
  if (h > 24 || m > 59) return Number.NaN
  return h * 60 + m
}

/** D-4: 所定労働時間は 1〜1440 分の整数 */
export function isValidWorkMinutes(m: number): boolean {
  return Number.isInteger(m) && m >= 1 && m <= 1440
}

export type CompanyHolidayError = 'invalidDate' | 'reversed' | 'tooLong'

/** R-15: 会社の休日の検証。空になるのは isValidCompanyHoliday が true のときだけ */
export function checkCompanyHoliday(h: CompanyHoliday): readonly CompanyHolidayError[] {
  const valid = h.kind === 'once' ? isValidIsoDate(h.start) && isValidIsoDate(h.end) : isValidMonthDay(h.start) && isValidMonthDay(h.end)
  if (!valid) return ['invalidDate']
  if (h.kind === 'once' && h.start > h.end) return ['reversed']
  if (companyHolidayDays(h) > MAX_COMPANY_HOLIDAY_DAYS) return ['tooLong']
  return []
}

/** M-4: 「毎年」の日の選択肢。2 月は 29 日まで（2 月 29 日も選べる） */
export function monthDayChoices(month: number): readonly number[] {
  const last = new Date(Date.UTC(2000, month, 0)).getUTCDate()
  return Array.from({ length: last }, (_, i) => i + 1)
}

/** M-4: 月を変えたとき、日がその月にないなら末日にする */
export function clampMonthDay(month: number, day: number): number {
  return Math.min(day, monthDayChoices(month).length)
}
