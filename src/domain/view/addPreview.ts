import { balanceOf, grantYearOfType } from '../leave/balance'
import type { IsoDate } from '../shared/date'
import type { Entry } from '../types'
import type { PlannerInput } from './input'

/**
 * `position` は、その休暇の種類の今日が入る付与年と比べた位置。前（previous）・今（current）・後（next）。
 * 期間で足すとき（F-307）は過ぎた日も入れられるので、前の付与年がある
 */
export type GrantYearPosition = 'previous' | 'current' | 'next'
export type GrantYearDelta = Readonly<{ grantYearStart: IsoDate; before: number; after: number; position: GrantYearPosition }>

/** 休む日が入る、その休暇の種類の付与年の開始日（古い順）。有休の付与日が未設定なら null */
function grantYearStartsOf(input: PlannerInput, leaveTypeId: string, leaveDays: readonly IsoDate[]): readonly IsoDate[] | null {
  const starts: IsoDate[] = []
  for (const d of leaveDays) {
    const year = grantYearOfType(input.settings, leaveTypeId, d)
    if (year === null) return null
    starts.push(year.start)
  }
  return [...new Set(starts)].sort()
}

/** 付与年の開始日は IsoDate なので、文字列の大小が日付の前後になる。今日の付与年が求まらないとき（起きない）は後として扱う */
function positionOf(grantYearStart: IsoDate, currentStart: IsoDate | undefined): GrantYearPosition {
  if (currentStart === undefined || grantYearStart > currentStart) return 'next'
  return grantYearStart === currentStart ? 'current' : 'previous'
}

/**
 * F-206・F-209: 休む日を 1 日分の予定として足したと仮定し、休む日が入る付与年ごとに未割り当てを足す前と後で求める。
 * 付与年はその休暇の種類の付与される日で区切る（R-13）。有休の付与日が未設定なら空
 */
export function previewAdd(input: PlannerInput, leaveDays: readonly IsoDate[], leaveTypeId: string): readonly GrantYearDelta[] {
  const starts = grantYearStartsOf(input, leaveTypeId, leaveDays)
  if (starts === null) return []

  const added: readonly Entry[] = leaveDays.map((date, i) => ({
    id: `preview-${i}`,
    date,
    leaveTypeId,
    amount: { unit: 'day' },
    title: '',
    done: false,
  }))
  const after: PlannerInput = { ...input, entries: [...input.entries, ...added] }

  const currentStart = grantYearOfType(input.settings, leaveTypeId, input.today)?.start
  const unassignedOf = (target: PlannerInput, grantYearStart: IsoDate): number =>
    balanceOf({ settings: target.settings, entries: target.entries, leaveTypeId, grantYearStart })?.unassigned ?? 0
  return starts.map((grantYearStart) => ({
    grantYearStart,
    before: unassignedOf(input, grantYearStart),
    after: unassignedOf(after, grantYearStart),
    position: positionOf(grantYearStart, currentStart),
  }))
}

/**
 * §5.1: 引く休暇の残り。休む日がすべてその休暇の種類の 1 つの付与年に入るとき、その付与年の残り。
 * 付与年をまたぐときと、有休の付与日が未設定のときは null
 */
export function remainingFor(input: PlannerInput, leaveTypeId: string, leaveDays: readonly IsoDate[]): number | null {
  const starts = grantYearStartsOf(input, leaveTypeId, leaveDays)
  if (starts === null || starts.length !== 1) return null
  return balanceOf({ settings: input.settings, entries: input.entries, leaveTypeId, grantYearStart: starts[0] })?.remaining ?? null
}
