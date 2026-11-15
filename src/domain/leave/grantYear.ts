import { addDays, isValidIsoDate } from '@/domain/shared/date'
import type { IsoDate, MonthDay } from '@/domain/shared/date'

/** R-12: 2 月 29 日と存在しない月日は付与日にできない */
export function isValidGrantDay(md: MonthDay): boolean {
  if (md === '02-29') return false
  // うるう年の 2000 年で存在を確かめる（02-29 は上で除外済み）
  return /^\d{2}-\d{2}$/.test(md) && isValidIsoDate(`2000-${md}`)
}

function startYearOf(d: IsoDate, grantDay: MonthDay): number {
  const year = Number(d.slice(0, 4))
  const thisYear = `${String(year).padStart(4, '0')}-${grantDay}`
  return d >= thisYear ? year : year - 1
}

/** R-12: d が入る付与年の開始日（grantYearOf の start。終わりの日を求めないぶん軽い） */
export function grantYearStartOf(d: IsoDate, grantDay: MonthDay): IsoDate {
  return `${String(startYearOf(d, grantDay)).padStart(4, '0')}-${grantDay}`
}

/** R-12: 付与年は、d 以前で最も近い付与日から、次の付与日の前日まで */
export function grantYearOf(d: IsoDate, grantDay: MonthDay): { start: IsoDate; end: IsoDate } {
  const startYear = startYearOf(d, grantDay)
  const start = `${String(startYear).padStart(4, '0')}-${grantDay}`
  const next = `${String(startYear + 1).padStart(4, '0')}-${grantDay}`
  return { start, end: addDays(next, -1) }
}
