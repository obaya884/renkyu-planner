import { type RestCalendar, type Run, runContaining } from '@/domain/calendar/restDays'
import { grantYearOfType } from '@/domain/leave/balance'
import { type IsoDate, addDays, quarterStart } from '@/domain/shared/date'
import type { Entry, Settings } from '@/domain/types'
import { withLeaveDays } from './findCandidates'

/** `leaveDays` は休む日 D（日付の早い順） */
export type TogetherCandidate = Readonly<{ leaveDays: readonly IsoDate[]; run: Run }>

export type TogetherQuarter = Readonly<{ quarterStart: IsoDate; candidates: readonly TogetherCandidate[] }>

/** R-20: 四半期ごとに出す候補の上限 */
export const TOGETHER_LIMIT = 5

/**
 * R-20・F-212: まとめて取る休暇の候補を、四半期ごとに返す。
 * 営業日（土日・祝日・会社の休日でない日。1 日分の日程の日も含む）を、土日・祝日・会社の休日だけを飛ばして N 日続けて取る。
 * `cal` は restCalendarOf のカレンダー、`end` は R-19 の末日
 */
export function findTogetherCandidates(
  input: Readonly<{ cal: RestCalendar; settings: Settings; entries: readonly Entry[]; leaveTypeId: string; today: IsoDate; end: IsoDate }>,
): TogetherQuarter[] {
  const { cal, settings, entries, leaveTypeId, today, end } = input
  const type = settings.leaveTypes.find((t) => t.id === leaveTypeId)
  if (type === undefined || !type.together || !Number.isInteger(type.days) || type.days < 1) return []
  if (grantYearOfType(settings, leaveTypeId, today) === null) return []
  const n = type.days
  const { usable } = type

  // 'leave'（1 日分の日程の日）は営業日として数える。cal.isRest は使わない
  const isWorkday = (d: IsoDate) => {
    const kind = cal.kindOf(d)
    return kind !== 'weekend' && kind !== 'holiday' && kind !== 'company'
  }
  const entryDates = new Set(entries.map((e) => e.date))
  const ownDates = entries.filter((e) => e.leaveTypeId === leaveTypeId).map((e) => e.date)

  const accepted = (leaveDays: readonly IsoDate[]): boolean => {
    if (leaveDays.some((d) => entryDates.has(d))) return false
    const first = grantYearOfType(settings, leaveTypeId, leaveDays[0])
    const last = grantYearOfType(settings, leaveTypeId, leaveDays[leaveDays.length - 1])
    if (first === null || last === null || first.start !== last.start) return false
    if (ownDates.some((d) => first.start <= d && d <= first.end)) return false
    if (usable !== null && !leaveDays.every((d) => usable.start <= d.slice(5) && d.slice(5) <= usable.end)) return false
    return true
  }

  const byQuarter = new Map<IsoDate, TogetherCandidate[]>()
  for (let d0 = today; d0 <= end; d0 = addDays(d0, 1)) {
    if (!isWorkday(d0)) continue
    const leaveDays: IsoDate[] = [d0]
    let d = d0
    // end を過ぎたら打ち切る（営業日が無い設定でも止まる）
    while (leaveDays.length < n && d <= end) {
      d = addDays(d, 1)
      if (isWorkday(d)) leaveDays.push(d)
    }
    if (leaveDays.length < n || leaveDays[leaveDays.length - 1] > end) continue
    if (!accepted(leaveDays)) continue
    const run = runContaining(withLeaveDays(cal, leaveDays), d0)
    if (run === null) continue
    const q = quarterStart(d0)
    byQuarter.set(q, [...(byQuarter.get(q) ?? []), { leaveDays, run }])
  }

  return [...byQuarter.keys()].sort().map((q) => ({
    quarterStart: q,
    candidates: (byQuarter.get(q) ?? [])
      .sort((a, b) => b.run.days - a.run.days || (a.leaveDays[0] < b.leaveDays[0] ? -1 : a.leaveDays[0] > b.leaveDays[0] ? 1 : 0))
      .slice(0, TOGETHER_LIMIT),
  }))
}
