import { type IsoDate, addDays, isValidIsoDate } from '../shared/date'
import { type PlannerInput, restCalendarOf } from '../view/input'
import { lastAddableDate } from './checkDraft'

export type RangeError = 'invalidDate' | 'endBeforeStart' | 'tooFar' | 'noDays' | 'tooManyDays'

/** F-307: 一度に足せる日の数（§5.2） */
export const MAX_RANGE_DAYS = 31

/**
 * F-307・§5.2: 期間で足すときの足す日。start から end までのうち、土日・祝日・会社の休日でない日。
 * 1 日分の日程がある日も入れ、start が休みの日でも断らず飛ばす。理由があるときの days は空
 */
export function rangeDays(input: PlannerInput, start: IsoDate, end: IsoDate): Readonly<{ days: readonly IsoDate[]; errors: readonly RangeError[] }> {
  if (!isValidIsoDate(start) || !isValidIsoDate(end)) return { days: [], errors: ['invalidDate'] }
  const errors: RangeError[] = []
  if (end < start) errors.push('endBeforeStart')
  if (end > lastAddableDate(input.today)) errors.push('tooFar') // R-19
  if (errors.length > 0) return { days: [], errors }

  const cal = restCalendarOf(input)
  const days: IsoDate[] = []
  // MAX_RANGE_DAYS を 1 つ超えたところで数えるのをやめる（start が遠い過去でも固まらない）
  for (let d = start; d <= end && days.length <= MAX_RANGE_DAYS; d = addDays(d, 1)) {
    const kind = cal.kindOf(d)
    if (kind !== 'weekend' && kind !== 'holiday' && kind !== 'company') days.push(d)
  }
  if (days.length === 0) return { days: [], errors: ['noDays'] }
  if (days.length > MAX_RANGE_DAYS) return { days: [], errors: ['tooManyDays'] }
  return { days, errors: [] }
}
