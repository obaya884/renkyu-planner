import { balanceOf } from '../leave/balance'
import { type FiveDayStatus, fiveDayStatus } from '../leave/fiveDays'
import { type Quarter, longBreakOf, planningQuarters } from '../quarters/quarters'
import type { MonthDay } from '../shared/date'
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
}>

/** 主な画面の上の部分（持ち分・年 5 日の取得・長めの休暇）の組み立て */
export function buildSummary(input: PlannerInput): SummaryView {
  const { settings, entries, today } = input
  const grantYear = currentGrantYear(input)
  const cal = restCalendarOf(input)
  const longBreaks = planningQuarters(today).map((quarter) => ({ quarter, has: longBreakOf(cal, quarter) !== null }))
  const holidaysOnly = settings.companyHolidays.length === 0 && entries.length === 0

  if (grantYear === null) return { state: 'unset', cards: [], fiveDays: null, longBreaks, holidaysOnly }

  const cards: BalanceCard[] = []
  for (const type of settings.leaveTypes) {
    const b = balanceOf({ settings, entries, leaveTypeId: type.id, grantYearStart: grantYear.start })
    if (b === null) continue
    cards.push({
      leaveTypeId: type.id,
      name: type.name,
      remaining: b.remaining,
      planned: b.planned,
      unassigned: b.unassigned,
      short: b.unassigned <= -1,
      usable: type.usable,
    })
  }
  const five = fiveDayStatus({ settings, entries, grantYearStart: grantYear.start, today })
  const fiveDays = five !== null && five.remainingDays > 0 ? five : null
  return { state: 'set', cards, fiveDays, longBreaks, holidaysOnly }
}
