import { checkEntryDraft } from '../entries/checkDraft'
import { type RangeError, rangeDays } from '../entries/entryRange'
import type { IsoDate } from '../shared/date'
import { type GrantYearDelta, previewAdd } from './addPreview'
import type { PlannerInput } from './input'

export type RangePreview = Readonly<{
  days: readonly IsoDate[]
  errors: readonly RangeError[]
  overOneDay: boolean
  deltas: readonly GrantYearDelta[]
}>

/**
 * F-307・§5.2: 期間で足すときの見通し。足す日、合計が 1 日を超える日があるか（F-306）、
 * 付与年ごとの未割り当ての前後
 */
export function previewRange(input: PlannerInput, start: IsoDate, end: IsoDate, leaveTypeId: string): RangePreview {
  const { days, errors } = rangeDays(input, start, end)
  if (days.length === 0) return { days, errors, overOneDay: false, deltas: [] }

  const overOneDay = days.some(
    (date) => checkEntryDraft(input, { date, leaveTypeId, amount: { unit: 'day' }, title: '', done: false }, null).overOneDay,
  )
  return { days, errors, overOneDay, deltas: previewAdd(input, days, leaveTypeId) }
}
