import { diffDays, isValidIsoDate } from '../shared/date'
import type { CompanyHoliday } from '../types'

/** 会社の休日 1 件の長さの上限（日）。入力欄の検証と計算の両方が使う（R-15） */
export const MAX_COMPANY_HOLIDAY_DAYS = 31

// 2 月 29 日がある年で数える（R-15）。年をまたぐときは 1999 年の開始月日から 2000 年の終了月日まで
const LEAP_YEAR = 2000
const PREV_YEAR = 1999

/** R-15。実在する月日か（2 月 29 日も実在として扱う） */
export function isValidMonthDay(md: string): boolean {
  return /^\d{2}-\d{2}$/.test(md) && isValidIsoDate(`${LEAP_YEAR}-${md}`)
}

/**
 * R-15。1 件の長さ（日）。日付と月日が実在するときだけ意味を持つ。
 * 「その年だけ」で開始が終了より後のときは 0 以下になる。「毎年」は 2 月 29 日がある年で数える
 */
export function companyHolidayDays(h: CompanyHoliday): number {
  if (h.kind === 'once') return diffDays(h.start, h.end) + 1
  return h.start <= h.end
    ? diffDays(`${LEAP_YEAR}-${h.start}`, `${LEAP_YEAR}-${h.end}`) + 1
    : diffDays(`${PREV_YEAR}-${h.start}`, `${LEAP_YEAR}-${h.end}`) + 1
}

/** R-15。受け付けてよい会社の休日か */
export function isValidCompanyHoliday(h: CompanyHoliday): boolean {
  if (h.kind === 'once') {
    return isValidIsoDate(h.start) && isValidIsoDate(h.end) && h.start <= h.end && companyHolidayDays(h) <= MAX_COMPANY_HOLIDAY_DAYS
  }
  return isValidMonthDay(h.start) && isValidMonthDay(h.end) && companyHolidayDays(h) <= MAX_COMPANY_HOLIDAY_DAYS
}
