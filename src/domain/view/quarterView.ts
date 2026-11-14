import { type RestCalendar, type RestKind, type Run, runContaining } from '../calendar/restDays'
import { type Candidate, findCandidates } from '../candidates/findCandidates'
import { groupCandidates } from '../candidates/groupCandidates'
import { monthGaps } from '../candidates/monthGap'
import { isShort } from '../leave/amount'
import { grantDaysOf } from '../leave/balance'
import { type Quarter, longBreakOf } from '../quarters/quarters'
import { type IsoDate, addDays, monthEnd, weekday } from '../shared/date'
import type { Entry, WeekStart } from '../types'
import { previewAdd } from './addPreview'
import { type PlannerInput, currentGrantYear, restCalendarOf } from './input'

/** 重なったときはこの順で前を優先する（画面定義書 §3.6） */
export type DayMark = 'done' | 'planned' | 'candidate' | 'company' | 'off'
const MARK_ORDER: readonly DayMark[] = ['done', 'planned', 'candidate', 'company', 'off']

export type DayCell = Readonly<{ date: IsoDate; day: number; mark: DayMark | null; grantDay: boolean }>
/** 週の始まりは設定に従う（F-108）。1 週は 7 つで、その月でない所は null */
export type MonthView = Readonly<{ month: IsoDate; weekStart: WeekStart; weeks: readonly (readonly (DayCell | null)[])[] }>

export type CandidateRow = Readonly<{
  leaveDays: readonly IsoDate[]
  run: Run
  long: boolean
  unconfirmed: boolean
  /** 今日が入る付与年の次の付与年の日を 1 日でも含む */
  nextGrantYear: boolean
  /** 入れると未割り当てが負になる付与年の不足の合計（分）。不足が無いか、付与日が未設定なら null */
  shortMinutes: number | null
}>

export type CandidateBlock = Readonly<
  | { kind: 'group'; core: IsoDate; primary: readonly CandidateRow[]; rest: readonly CandidateRow[]; restHasLong: boolean }
  | { kind: 'monthGap'; month: IsoDate; unconfirmed: boolean; runDays: number; rows: readonly CandidateRow[] }
>

export type EntryRow = Readonly<{
  entry: Entry
  overdue: boolean
  overlap: boolean
  run: Run | null
  /** run が長め（5 日以上）。run が null なら false */
  long: boolean
  /** 有休以外の休暇の種類の名前。有休か、種類が見つからないときは null */
  leaveTypeName: string | null
}>
/** run があるのは、同じ連休に入る日程が 2 件以上の塊。long はその run が長め */
export type EntryBlock = Readonly<{ run: Run | null; long: boolean; rows: readonly EntryRow[] }>

export type GrantNote = Readonly<{ date: IsoDate; entered: boolean; grantDays: number }>

export type QuarterView = Readonly<{
  quarter: Quarter
  past: boolean
  longBreak: Run | null
  months: readonly MonthView[]
  marks: readonly DayMark[]
  grantNote: GrantNote | null
  candidates: readonly CandidateBlock[]
  entries: readonly EntryBlock[]
}>

const LONG_RUN_DAYS = 5

/** 連休が長め（5 日以上）か。連休の長めはここで 1 つに決める */
const isLongRun = (run: Run | null): boolean => run !== null && run.days >= LONG_RUN_DAYS

type Ctx = Readonly<{ input: PlannerInput; cal: RestCalendar; nextGrantYearStart: IsoDate | null }>

// ---- 候補 ----

/** leaveDays を 1 日分の有休の予定として足したときの、不足している付与年の不足の合計。面（previewAdd）と同じ数え方（§3.7） */
function shortMinutesOf(input: PlannerInput, leaveDays: readonly IsoDate[]): number | null {
  if (input.settings.grantDay === null) return null
  let short = 0
  for (const { after } of previewAdd(input, leaveDays, 'paid')) if (isShort(after)) short += -after
  return short > 0 ? short : null
}

function rowOf(ctx: Ctx, leaveDays: readonly IsoDate[], run: Run, long: boolean, unconfirmed: boolean): CandidateRow {
  const next = ctx.nextGrantYearStart
  return {
    leaveDays,
    run,
    long,
    unconfirmed,
    nextGrantYear: next !== null && leaveDays.some((d) => d >= next),
    shortMinutes: shortMinutesOf(ctx.input, leaveDays),
  }
}

const candidateRow = (ctx: Ctx, c: Candidate) => rowOf(ctx, c.leaveDays, c.run, c.long, c.unconfirmed)

/** d を休みの日に足したカレンダーで、d を含む連休 */
function runWithLeave(cal: RestCalendar, d: IsoDate): Run | null {
  const kindOf = (x: IsoDate): RestKind | null => (x === d ? 'leave' : cal.kindOf(x))
  return runContaining({ kindOf, isRest: (x) => kindOf(x) !== null }, d)
}

type Placed = Readonly<{ quarterStart: IsoDate; block: CandidateBlock }>

/** 過ぎていない四半期の最初の日から最後の日までを 1 回で列挙し、四半期ごとに置く塊（R-5〜R-10） */
function candidateBlocks(ctx: Ctx, active: readonly Quarter[]): { placed: Placed[]; primaryDays: Set<IsoDate> } {
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

// ---- 月カレンダー ----

function markOf(ctx: Ctx, d: IsoDate, candidateDays: ReadonlySet<IsoDate>): DayMark | null {
  const onDay = ctx.input.entries.filter((e) => e.date === d)
  if (onDay.some((e) => e.done)) return 'done'
  if (onDay.length > 0) return 'planned'
  if (candidateDays.has(d)) return 'candidate'
  const kind = ctx.cal.kindOf(d)
  if (kind === 'company') return 'company'
  if (kind === 'holiday' || kind === 'weekend') return 'off'
  return null
}

function monthView(ctx: Ctx, month: IsoDate, candidateDays: ReadonlySet<IsoDate>): MonthView {
  const grantDay = ctx.input.settings.grantDay
  const weeks: (DayCell | null)[][] = []
  const weekStart = ctx.input.settings.weekStart
  // 月の 1 日の前に空ける数。月曜始まりでは、月曜が 0、日曜が 6
  const lead = weekStart === 'monday' ? (weekday(month) + 6) % 7 : weekday(month)
  let week: (DayCell | null)[] = Array.from({ length: lead }, () => null)
  const last = monthEnd(month)
  for (let d = month; d <= last; d = addDays(d, 1)) {
    week.push({ date: d, day: Number(d.slice(8)), mark: markOf(ctx, d, candidateDays), grantDay: grantDay !== null && d.slice(5) === grantDay })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) weeks.push([...week, ...Array.from({ length: 7 - week.length }, () => null)])
  return { month, weekStart, weeks }
}

function monthsOf(q: Quarter): IsoDate[] {
  const months: IsoDate[] = []
  for (let m = q.start; m <= q.end; m = addDays(monthEnd(m), 1)) months.push(m)
  return months
}

/** その四半期の中の、今日より後の付与日 */
function grantNoteOf(ctx: Ctx, q: Quarter): GrantNote | null {
  const { settings, today } = ctx.input
  if (settings.grantDay === null) return null
  for (const year of new Set([q.start.slice(0, 4), q.end.slice(0, 4)])) {
    const date = `${year}-${settings.grantDay}`
    if (q.start <= date && date <= q.end && date > today) {
      return { date, entered: date in settings.grantYears, grantDays: grantDaysOf(settings, date) }
    }
  }
  return null
}

// ---- 日程 ----

/** 日付の早い順。同じ連休に入る 1 日分の日程が 2 件以上なら 1 つの塊にまとめる（F-304） */
function entryBlocks(ctx: Ctx, q: Quarter): EntryBlock[] {
  const { cal, input } = ctx
  const rows: EntryRow[] = input.entries
    .filter((e) => q.start <= e.date && e.date <= q.end)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((entry) => {
      const kind = cal.kindOf(entry.date)
      const run = entry.amount.unit === 'day' ? runContaining(cal, entry.date) : null
      return {
        entry,
        overdue: !entry.done && entry.date < input.today,
        overlap: kind !== null && kind !== 'leave',
        run,
        long: isLongRun(run),
        leaveTypeName: entry.leaveTypeId === 'paid' ? null : (input.settings.leaveTypes.find((t) => t.id === entry.leaveTypeId)?.name ?? null),
      }
    })
  const keyOf = (run: Run) => `${run.start}/${run.end}`
  const counts = new Map<string, number>()
  for (const r of rows) if (r.run) counts.set(keyOf(r.run), (counts.get(keyOf(r.run)) ?? 0) + 1)

  const blocks: { run: Run | null; long: boolean; rows: EntryRow[] }[] = []
  const shared = new Map<string, { run: Run | null; long: boolean; rows: EntryRow[] }>()
  for (const r of rows) {
    const key = r.run ? keyOf(r.run) : null
    if (key === null || (counts.get(key) ?? 0) < 2) {
      blocks.push({ run: null, long: false, rows: [r] })
      continue
    }
    let block = shared.get(key)
    if (!block) {
      block = { run: r.run, long: isLongRun(r.run), rows: [] }
      shared.set(key, block)
      blocks.push(block)
    }
    block.rows.push(r)
  }
  return blocks
}

// ---- 四半期 ----

/** 主な画面の四半期ごとの節（月カレンダー・候補・日程）の組み立て */
export function buildQuarterViews(input: PlannerInput, quarters: readonly Quarter[]): QuarterView[] {
  const current = currentGrantYear(input)
  const ctx: Ctx = { input, cal: restCalendarOf(input), nextGrantYearStart: current === null ? null : addDays(current.end, 1) }
  const active = quarters.filter((q) => q.end >= input.today)
  const { placed, primaryDays } = candidateBlocks(ctx, active)
  const none = new Set<IsoDate>()

  return quarters.map((quarter) => {
    const past = quarter.end < input.today
    const months = monthsOf(quarter).map((m) => monthView(ctx, m, past ? none : primaryDays))
    const shown = new Set(months.flatMap((m) => m.weeks.flat()).map((c) => c?.mark ?? null))
    const groups = placed.filter((p) => p.quarterStart === quarter.start && p.block.kind === 'group')
    const gaps = placed.filter((p) => p.quarterStart === quarter.start && p.block.kind === 'monthGap')
    return {
      quarter,
      past,
      longBreak: longBreakOf(ctx.cal, quarter),
      months,
      marks: MARK_ORDER.filter((m) => shown.has(m)),
      grantNote: grantNoteOf(ctx, quarter),
      candidates: past ? [] : [...groups, ...gaps].map((p) => p.block),
      entries: entryBlocks(ctx, quarter),
    }
  })
}
