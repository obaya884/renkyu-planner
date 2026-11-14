import { diffDays, isValidIsoDate } from '../shared/date'
import type { CompanyHoliday } from '../types'

/** 会社の休日 1 件の長さの上限（日）。入力欄の検証と計算の両方が使う（R-15） */
export const MAX_COMPANY_HOLIDAY_DAYS = 31

// 2 月 29 日がある年で数える（R-15）。年をまたぐときは 1999 年の開始月日から 2000 年の終了月日まで
const LEAP_YEAR = 2000
const PREV_YEAR = 1999

function isValidMonthDay(md: string): boolean {
  return /^\d{2}-\d{2}$/.test(md) && isValidIsoDate(`${LEAP_YEAR}-${md}`)
}

/** R-15。受け付けてよい会社の休日か */
export function isValidCompanyHoliday(h: CompanyHoliday): boolean {
  if (h.kind === 'once') {
    return isValidIsoDate(h.start) && isValidIsoDate(h.end) && h.start <= h.end && diffDays(h.start, h.end) + 1 <= MAX_COMPANY_HOLIDAY_DAYS
  }
  if (!isValidMonthDay(h.start) || !isValidMonthDay(h.end)) return false
  const days =
    h.start <= h.end
      ? diffDays(`${LEAP_YEAR}-${h.start}`, `${LEAP_YEAR}-${h.end}`) + 1
      : diffDays(`${PREV_YEAR}-${h.start}`, `${LEAP_YEAR}-${h.end}`) + 1
  return days <= MAX_COMPANY_HOLIDAY_DAYS
}
