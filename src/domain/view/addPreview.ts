import { balanceOf, grantYearOfType } from '../leave/balance'
import type { IsoDate } from '../shared/date'
import type { Entry } from '../types'
import type { PlannerInput } from './input'

/** `current` は、その休暇の種類の、今日が入る付与年か */
export type GrantYearDelta = Readonly<{ grantYearStart: IsoDate; before: number; after: number; current: boolean }>

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
    current: grantYearStart === currentStart,
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
