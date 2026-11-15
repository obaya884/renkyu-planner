import type { RestCalendar, RestKind, Run } from '@/domain/calendar/restDays'
import { MAX_RUN_DAYS, runContaining } from '@/domain/calendar/restDays'
import { type IsoDate, addDays, weekday } from '@/domain/shared/date'

export type Candidate = Readonly<{
  leaveDays: readonly IsoDate[]
  run: Run
  long: boolean
  unconfirmed: boolean
  core: IsoDate
}>

const MAX_LEAVE_DAYS = 3
const MIN_GAIN = 3
const LONG_RUN_DAYS = 5

/** leaveDays も休みの日として見るカレンダー */
export function withLeaveDays(cal: RestCalendar, leaveDays: readonly IsoDate[]): RestCalendar {
  const set = new Set(leaveDays)
  const kindOf = (d: IsoDate): RestKind | null => (set.has(d) ? 'leave' : cal.kindOf(d))
  return { kindOf, isRest: (d) => kindOf(d) !== null }
}

function lastRestDayFrom(cal: RestCalendar, d: IsoDate): IsoDate {
  let end = d
  for (let i = 1; i < MAX_RUN_DAYS && cal.isRest(addDays(end, 1)); i++) end = addDays(end, 1)
  return end
}

/** R-5。並びの最初の祝日・会社の休日の平日。無ければ leave でない最初の休みの日 */
function coreOf(cal: RestCalendar, run: Run): IsoDate {
  let fallback: IsoDate | null = null
  for (let d = run.start; d <= run.end; d = addDays(d, 1)) {
    const kind = cal.kindOf(d)
    const w = weekday(d)
    if ((kind === 'holiday' || kind === 'company') && w >= 1 && w <= 5) return d
    if (fallback === null && kind !== 'leave') fallback = d
  }
  return fallback ?? run.start
}

export function findCandidates(input: {
  cal: RestCalendar
  entryDates: ReadonlySet<IsoDate>
  today: IsoDate
  start: IsoDate
  end: IsoDate
  confirmedUntil: IsoDate
}): Candidate[] {
  const { cal, entryDates, today, start, end, confirmedUntil } = input
  const canLeave = (d: IsoDate) => !cal.isRest(d) && d >= today && !entryDates.has(d)
  const found: Candidate[] = []

  const visit = (leaveDays: readonly IsoDate[]) => {
    const view = withLeaveDays(cal, leaveDays)
    const run = runContaining(view, leaveDays[0])
    if (run !== null && leaveDays.every((d) => run.start <= d && d <= run.end) && run.days >= leaveDays.length + MIN_GAIN) {
      found.push({
        leaveDays,
        run,
        long: run.days >= LONG_RUN_DAYS,
        unconfirmed: addDays(run.end, 1) > confirmedUntil,
        core: coreOf(view, run),
      })
    }
    if (leaveDays.length >= MAX_LEAVE_DAYS) return
    const next = addDays(run?.end ?? lastRestDayFrom(view, leaveDays[leaveDays.length - 1]), 1)
    if (canLeave(next)) visit([...leaveDays, next])
  }

  for (let d0 = start; d0 <= end; d0 = addDays(d0, 1)) {
    if (canLeave(d0)) visit([d0])
  }
  return found.sort((a, b) => (a.leaveDays[0] < b.leaveDays[0] ? -1 : a.leaveDays[0] > b.leaveDays[0] ? 1 : a.leaveDays.length - b.leaveDays.length))
}
