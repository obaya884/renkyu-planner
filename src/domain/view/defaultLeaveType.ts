import type { IsoDate } from '../shared/date'
import { PAID_LEAVE_TYPE_ID } from '../types'
import { previewAdd } from './addPreview'
import type { PlannerInput } from './input'

/**
 * F-208・§5.1: 日程に入れるときの引く休暇の初期値。次の両方に当たる種類のうち、設定画面の並びで上のもの。
 * (1) 使える期間があり、休む日が全部その期間（月日で開始以上・終了以下）に入る。
 * (2) 休む日が入るその種類の付与年ごとに、未割り当てが、その付与年に入る休む量（1 日分 × 日数）以上ある。
 * 当たるものが無いか、有休の付与日が未設定なら有休
 */
export function defaultLeaveTypeId(input: PlannerInput, leaveDays: readonly IsoDate[]): string {
  for (const type of input.settings.leaveTypes) {
    const { usable } = type
    if (usable === null) continue
    if (!leaveDays.every((d) => usable.start <= d.slice(5) && d.slice(5) <= usable.end)) continue
    const deltas = previewAdd(input, leaveDays, type.id)
    if (deltas.length > 0 && deltas.every((d) => d.after >= 0)) return type.id
  }
  return PAID_LEAVE_TYPE_ID
}
