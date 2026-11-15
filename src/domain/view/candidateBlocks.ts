import { type RestCalendar, type RestKind, type Run, runContaining } from '../calendar/restDays'
import { type Candidate, findCandidates } from '../candidates/findCandidates'
import { groupCandidates } from '../candidates/groupCandidates'
import { monthGaps } from '../candidates/monthGap'
import { isShort } from '../leave/amount'
import { grantYearOfType } from '../leave/balance'
import type { Quarter } from '../quarters/quarters'
import type { IsoDate } from '../shared/date'
import { previewAdd } from './addPreview'
import { defaultLeaveTypeId } from './defaultLeaveType'
import type { PlannerInput } from './input'

export type CandidateRow = Readonly<{
  leaveDays: readonly IsoDate[]
  run: Run
  long: boolean
  unconfirmed: boolean
  /** 日程に入れるときの引く休暇の初期値（F-208。defaultLeaveTypeId）と、その名前 */
  leaveTypeId: string
  leaveTypeName: string
  /** leaveTypeId の種類で、今日が入る付与年の次の付与年の日を 1 日でも含む */
  nextGrantYear: boolean
  /** leaveTypeId の種類で入れると未割り当てが負になる付与年の不足の合計（分）。不足が無いか、付与日が未設定なら null */
  shortMinutes: number | null
}>

export type CandidateBlock = Readonly<
  | { kind: 'group'; core: IsoDate; primary: readonly CandidateRow[]; rest: readonly CandidateRow[]; restHasLong: boolean }
  | { kind: 'monthGap'; month: IsoDate; unconfirmed: boolean; runDays: number; rows: readonly CandidateRow[] }
>

const LONG_RUN_DAYS = 5

/** 連休が長め（5 日以上）か。連休の長めはここで 1 つに決める */
export const isLongRun = (run: Run | null): boolean => run !== null && run.days >= LONG_RUN_DAYS

export type Ctx = Readonly<{ input: PlannerInput; cal: RestCalendar }>

/** leaveDays をその種類の 1 日分の予定として足したときの、不足している付与年の不足の合計。モーダル（previewAdd）と同じ数え方（§3.7） */
function shortMinutesOf(input: PlannerInput, leaveDays: readonly IsoDate[], leaveTypeId: string): number | null {
  let short = 0
  for (const { after } of previewAdd(input, leaveDays, leaveTypeId)) if (isShort(after)) short += -after
  return short > 0 ? short : null
}

/** F-209・§3.7: その種類の、今日が入る付与年の次の付与年の日を含むか。付与日が未設定なら false */
function inNextGrantYear(input: PlannerInput, leaveDays: readonly IsoDate[], leaveTypeId: string): boolean {
  const current = grantYearOfType(input.settings, leaveTypeId, input.today)
  return current !== null && leaveDays.some((d) => d > current.end)
}

function rowOf(ctx: Ctx, leaveDays: readonly IsoDate[], run: Run, long: boolean, unconfirmed: boolean): CandidateRow {
  const { input } = ctx
  const leaveTypeId = defaultLeaveTypeId(input, leaveDays)
  return {
    leaveDays,
    run,
    long,
    unconfirmed,
    leaveTypeId,
    // defaultLeaveTypeId は leaveTypes の中の id を返すので、名前は見つかる（leaveTypes が空のときだけ ''）
    leaveTypeName: input.settings.leaveTypes.find((t) => t.id === leaveTypeId)?.name ?? '',
    nextGrantYear: inNextGrantYear(input, leaveDays, leaveTypeId),
    shortMinutes: shortMinutesOf(input, leaveDays, leaveTypeId),
  }
}

const candidateRow = (ctx: Ctx, c: Candidate) => rowOf(ctx, c.leaveDays, c.run, c.long, c.unconfirmed)

/** d を休みの日に足したカレンダーで、d を含む連休 */
function runWithLeave(cal: RestCalendar, d: IsoDate): Run | null {
  const kindOf = (x: IsoDate): RestKind | null => (x === d ? 'leave' : cal.kindOf(x))
  return runContaining({ kindOf, isRest: (x) => kindOf(x) !== null }, d)
}

export type Placed = Readonly<{ quarterStart: IsoDate; block: CandidateBlock }>

/** 過ぎていない四半期の最初の日から最後の日までを 1 回で列挙し、四半期ごとに置く塊（R-5〜R-10） */
export function candidateBlocks(ctx: Ctx, active: readonly Quarter[]): { placed: Placed[]; primaryDays: Set<IsoDate> } {
  const placed: Placed[] = []
  const primaryDays = new Set<IsoDate>()
  if (active.length === 0) return { placed, primaryDays }
  const { input, cal } = ctx
  const range = {
    cal,
    today: input.today,
    start: active[0].start,
    end: active[active.length - 1].end,
    confirmedUntil: input.holidays.confirmedUntil,
  }
  const cands = findCandidates({ ...range, entryDates: new Set(input.entries.map((e) => e.date)) })

  for (const g of groupCandidates(cands)) {
    // §5.1: 休む日数がいちばん少ないもの全部を開かずに見せる。順は groupCandidates の R-7 のまま
    const fewest = Math.min(...g.candidates.map((c) => c.leaveDays.length))
    const isPrimary = (c: Candidate) => c.leaveDays.length === fewest
    const primary = g.candidates.filter(isPrimary).map((c) => candidateRow(ctx, c))
    const rest = g.candidates.filter((c) => !isPrimary(c)).map((c) => candidateRow(ctx, c))
    for (const r of primary) for (const d of r.leaveDays) primaryDays.add(d)
    placed.push({
      quarterStart: g.quarterStart,
      block: { kind: 'group', core: g.core, primary, rest, restHasLong: rest.some((r) => r.long) },
    })
  }

  for (const gap of monthGaps({ ...range, entries: input.entries })) {
    // 金曜か月曜を休めば土日と続くので、連休は必ずある
    const rows = gap.options.map((d) => {
      const run = runWithLeave(cal, d) as Run
      return rowOf(ctx, [d], run, isLongRun(run), gap.unconfirmed)
    })
    const runDays = Math.min(...rows.map((r) => r.run.days))
    const quarter = active.find((q) => q.start <= gap.month && gap.month <= q.end)
    if (quarter) placed.push({ quarterStart: quarter.start, block: { kind: 'monthGap', month: gap.month, unconfirmed: gap.unconfirmed, runDays, rows } })
  }
  return { placed, primaryDays }
}
