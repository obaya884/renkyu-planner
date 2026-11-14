import { balanceOf } from '../leave/balance'
import { grantYearOf } from '../leave/grantYear'
import type { IsoDate } from '../shared/date'
import type { Entry } from '../types'
import type { PlannerInput } from './input'

export type GrantYearDelta = Readonly<{ grantYearStart: IsoDate; before: number; after: number }>

/** F-206・F-209: 休む日を 1 日分の予定として足したと仮定し、休む日が入る付与年ごとに未割り当てを足す前と後で求める。付与日が未設定なら空 */
export function previewAdd(input: PlannerInput, leaveDays: readonly IsoDate[], leaveTypeId: string): readonly GrantYearDelta[] {
  const { grantDay } = input.settings
  if (grantDay === null) return []

  const added: readonly Entry[] = leaveDays.map((date, i) => ({
    id: `preview-${i}`,
    date,
    leaveTypeId,
    amount: { unit: 'day' },
    title: '',
    done: false,
  }))
  const after: PlannerInput = { ...input, entries: [...input.entries, ...added] }

  const starts = [...new Set(leaveDays.map((d) => grantYearOf(d, grantDay).start))].sort()
  const unassignedOf = (target: PlannerInput, grantYearStart: IsoDate): number =>
    balanceOf({ settings: target.settings, entries: target.entries, leaveTypeId, grantYearStart })?.unassigned ?? 0
  return starts.map((grantYearStart) => ({
    grantYearStart,
    before: unassignedOf(input, grantYearStart),
    after: unassignedOf(after, grantYearStart),
  }))
}
