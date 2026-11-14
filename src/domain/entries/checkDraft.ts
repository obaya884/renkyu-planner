import { toMinutes } from '../leave/amount'
import { isValidGrantDay } from '../leave/grantYear'
import { type IsoDate, type MonthDay, isValidIsoDate } from '../shared/date'
import type { Amount } from '../types'
import { restCalendarOf, type PlannerInput } from '../view/input'

export type EntryDraft = Readonly<{ date: IsoDate; leaveTypeId: string; amount: Amount; title: string; done: boolean }>
export type DraftError = 'invalidDate' | 'restDay' | 'invalidAmount' | 'unknownLeaveType'

/** R-17・F-306: 日程の入力の検証。editingId は直している日程の id（新規なら null）。overOneDay はエラーではなく知らせ */
export function checkEntryDraft(
  input: PlannerInput,
  draft: EntryDraft,
  editingId: string | null,
): { errors: readonly DraftError[]; overOneDay: boolean } {
  const { workMinutes, leaveTypes } = input.settings
  const others = input.entries.filter((e) => e.id !== editingId)
  const validDate = isValidIsoDate(draft.date)
  const errors: DraftError[] = []

  if (!validDate) errors.push('invalidDate')
  else {
    const kind = restCalendarOf({ ...input, entries: others }).kindOf(draft.date)
    if (kind === 'weekend' || kind === 'holiday' || kind === 'company') errors.push('restDay')
  }
  const { amount } = draft
  if (amount.unit === 'minutes' && (!Number.isInteger(amount.minutes) || amount.minutes < 1 || amount.minutes > workMinutes)) {
    errors.push('invalidAmount')
  }
  if (!leaveTypes.some((t) => t.id === draft.leaveTypeId)) errors.push('unknownLeaveType')

  const sameDay = others.filter((e) => e.date === draft.date).reduce((sum, e) => sum + toMinutes(e.amount, workMinutes), 0)
  const overOneDay = validDate && sameDay + toMinutes(amount, workMinutes) > workMinutes
  return { errors, overOneDay }
}

/** `entitlementMinutes` は持ち分の上書き（分）。null は計算に任せる（R-13） */
export type GrantDraft = Readonly<{ grantDay: MonthDay; grantDays: number; entitlementMinutes: number | null }>
export type GrantError = 'invalidGrantDay' | 'invalidGrantDays' | 'invalidEntitlement'

/** R-12・F-101: 付与日・付与日数（0〜366 で 0.5 刻み）・持ち分の上書き（null か 0 以上の整数の分）の検証 */
export function checkGrantDraft(draft: GrantDraft): readonly GrantError[] {
  const errors: GrantError[] = []
  if (!isValidGrantDay(draft.grantDay)) errors.push('invalidGrantDay')
  const { grantDays, entitlementMinutes } = draft
  if (!Number.isInteger(grantDays * 2) || grantDays < 0 || grantDays > 366) errors.push('invalidGrantDays')
  if (entitlementMinutes !== null && (!Number.isInteger(entitlementMinutes) || entitlementMinutes < 0)) errors.push('invalidEntitlement')
  return errors
}
