import { addDays } from '../shared/date'
import type { IsoDate, MonthDay } from '../shared/date'
import { balanceOf, grantDaysOf } from '../leave/balance'
import { grantYearOf } from '../leave/grantYear'
import { type CompanyHoliday, type LeaveType, PAID_LEAVE_TYPE_ID, type Settings } from '../types'
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
    entitlement: balanceOf({ settings, entries, leaveTypeId: PAID_LEAVE_TYPE_ID, grantYearStart: start })?.entitlement ?? 0,
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
    ...entries.filter((e) => e.leaveTypeId === PAID_LEAVE_TYPE_ID).map((e) => e.date),
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

/** 設定画面の会社の休日の 1 行（§6）。index は settings.companyHolidays の中の位置 */
export type CompanyHolidayRow = Readonly<{ index: number; holiday: CompanyHoliday }>

/** §6: 会社の休日の並び。「毎年」を先に開始の月日の早い順、そのあと「その年だけ」を開始日の早い順 */
export function companyHolidayRows(settings: Settings): readonly CompanyHolidayRow[] {
  return settings.companyHolidays
    .map((holiday, index) => ({ index, holiday }))
    .sort((a, b) => {
      if (a.holiday.kind !== b.holiday.kind) return a.holiday.kind === 'yearly' ? -1 : 1
      return a.holiday.start < b.holiday.start ? -1 : a.holiday.start > b.holiday.start ? 1 : a.index - b.index
    })
}

/** 設定画面の休暇の種類の 1 行（§6）。hasEntries は、その種類の日程が 1 件でもあるか（取得済みかと日付は問わない） */
export type LeaveTypeRow = Readonly<{ type: LeaveType; paid: boolean; hasEntries: boolean }>

/** §6: 休暇の種類の並び。設定の並びのまま */
export function leaveTypeRows(input: Pick<PlannerInput, 'settings' | 'entries'>): readonly LeaveTypeRow[] {
  return input.settings.leaveTypes.map((type) => ({
    type,
    paid: type.id === PAID_LEAVE_TYPE_ID,
    hasEntries: input.entries.some((e) => e.leaveTypeId === type.id),
  }))
}
