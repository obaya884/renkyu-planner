import { addDays } from '../shared/date'
import type { IsoDate, MonthDay } from '../shared/date'
import { balanceOf, grantDaysOf } from '../leave/balance'
import { grantYearOf } from '../leave/grantYear'
import { type PlannerInput, currentGrantYear } from './input'

/** 設定画面の付与年の 1 行（§6）。entered は、その付与年の設定を入れてあるか */
export type GrantYearRow = Readonly<{ start: IsoDate; end: IsoDate; entered: boolean; grantDays: number; entitlement: number }>

/** 設定画面の有休の節（§6）。past は新しい年が先 */
export type GrantSectionView = Readonly<{ grantDay: MonthDay; current: GrantYearRow; next: GrantYearRow; past: readonly GrantYearRow[] }>

/** 保存データに遠い年の日程があっても固まらないよう、さかのぼる年数に上限を置く（R-13・§5.1 の繰り越しと同じ） */
const MAX_PAST_YEARS = 100

function rowOf(input: PlannerInput, grantDay: MonthDay, start: IsoDate): GrantYearRow {
  const { settings, entries } = input
  const { end } = grantYearOf(start, grantDay)
  return {
    start,
    end,
    entered: settings.grantYears[start] !== undefined,
    grantDays: grantDaysOf(settings, start),
    entitlement: balanceOf({ settings, entries, leaveTypeId: 'paid', grantYearStart: start })?.entitlement ?? 0,
  }
}

/** F-405・§6: 有休の節の組み立て。付与日が未設定なら null */
export function buildGrantSection(input: PlannerInput): GrantSectionView | null {
  const { settings, entries } = input
  const { grantDay } = settings
  const year = currentGrantYear(input)
  if (grantDay === null || year === null) return null

  // 過ぎた付与年の出どころ: 設定のある付与年と、有休の日程の日付が入る付与年
  const starts = [
    ...Object.keys(settings.grantYears),
    ...entries.filter((e) => e.leaveTypeId === 'paid').map((e) => e.date),
  ].map((d) => grantYearOf(d, grantDay).start)
  const earliest = starts.sort()[0]

  const past: GrantYearRow[] = []
  let start = year.start
  while (earliest !== undefined && start > earliest && past.length < MAX_PAST_YEARS) {
    start = grantYearOf(addDays(start, -1), grantDay).start
    past.push(rowOf(input, grantDay, start))
  }

  return { grantDay, current: rowOf(input, grantDay, year.start), next: rowOf(input, grantDay, addDays(year.end, 1)), past }
}
