import { isShort } from '../leave/amount'
import { balanceOf, grantYearOfType } from '../leave/balance'
import { type FiveDayStatus, fiveDayStatus } from '../leave/fiveDays'
import { type Quarter, longBreakOf, planningQuarters } from '../quarters/quarters'
import type { IsoDate, MonthDay } from '../shared/date'
import { type PlannerInput, currentGrantYear, restCalendarOf } from './input'

/** 量は分のまま持つ。文字にするのは文言の層 */
export type BalanceCard = Readonly<{
  leaveTypeId: string
  name: string
  remaining: number
  planned: number
  unassigned: number
  short: boolean
  usable: { start: MonthDay; end: MonthDay } | null
}>

export type LongBreakChip = Readonly<{ quarter: Quarter; has: boolean }>

export type SummaryView = Readonly<{
  state: 'unset' | 'set'
  cards: readonly BalanceCard[]
  fiveDays: FiveDayStatus | null
  longBreaks: readonly LongBreakChip[]
  holidaysOnly: boolean
  /** F-407。今の付与年に設定が無く、前の付与年に設定があるとき、今の付与年の開始日 */
  newGrantYearStart: IsoDate | null
}>

/** 主な画面の上の部分（持ち分・年 5 日の取得・長めの休暇）の組み立て */
export function buildSummary(input: PlannerInput): SummaryView {
  const { settings, entries, today } = input
  const grantYear = currentGrantYear(input)
  const cal = restCalendarOf(input)
  const longBreaks = planningQuarters(today).map((quarter) => ({ quarter, has: longBreakOf(cal, quarter) !== null }))
  const holidaysOnly = settings.companyHolidays.length === 0 && entries.length === 0

  if (grantYear === null) return { state: 'unset', cards: [], fiveDays: null, longBreaks, holidaysOnly, newGrantYearStart: null }

  const cards: BalanceCard[] = []
  for (const type of settings.leaveTypes) {
    // §3.2・R-13: その種類の付与される日で区切った、今日が入る付与年で数える
    const year = grantYearOfType(settings, type.id, today)
    const b = year === null ? null : balanceOf({ settings, entries, leaveTypeId: type.id, grantYearStart: year.start })
    if (b === null) continue
    cards.push({
      leaveTypeId: type.id,
      name: type.name,
      remaining: b.remaining,
      planned: b.planned,
      unassigned: b.unassigned,
      short: isShort(b.unassigned),
      usable: type.usable,
    })
  }
  const five = fiveDayStatus({ settings, entries, grantYearStart: grantYear.start, today })
  const fiveDays = five !== null && five.remainingDays > 0 ? five : null
  const keys = Object.keys(settings.grantYears)
  const newGrantYearStart = !keys.includes(grantYear.start) && keys.some((k) => k < grantYear.start) ? grantYear.start : null
  return { state: 'set', cards, fiveDays, longBreaks, holidaysOnly, newGrantYearStart }
}
