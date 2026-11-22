import { type Run, runContaining } from '../calendar/restDays'
import { grantDaysOf } from '../leave/balance'
import { isTaken } from '../leave/taken'
import { type Quarter, longBreakOf } from '../quarters/quarters'
import { type IsoDate, addDays, monthEnd, weekday } from '../shared/date'
import { type Entry, PAID_LEAVE_TYPE_ID, type WeekStart } from '../types'
import { type CandidateGroupView, type Ctx, type MonthGapBlock, type Placed, candidateBlocks, ctxOf, entryMarkOf, isLongRun } from './candidateBlocks'
import type { PlannerInput } from './input'
import { type TogetherBlock, togetherBlocks } from './togetherBlocks'

export type { CandidateGroupView, CandidateRow, CoreHead, MonthGapBlock, Strip, StripDay, StripKind } from './candidateBlocks'
export type { TogetherBlock, TogetherRow } from './togetherBlocks'

/** 重なったときはこの順で前を優先する（画面定義書 §3.6） */
export type DayMark = 'done' | 'planned' | 'candidate' | 'company' | 'off'
const MARK_ORDER: readonly DayMark[] = ['done', 'planned', 'candidate', 'company', 'off']

export type DayCell = Readonly<{ date: IsoDate; day: number; mark: DayMark | null; grantDay: boolean }>
/** 週の始まりは設定に従う（F-108）。1 週は 7 つで、その月でない所は null */
export type MonthView = Readonly<{ month: IsoDate; weekStart: WeekStart; weeks: readonly (readonly (DayCell | null)[])[] }>

export type EntryRow = Readonly<{
  entry: Entry
  /** 取得済みか（日付が今日以前。R-13）。false なら予定 */
  taken: boolean
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

export type LongBreakStatus = 'has' | 'notYet' | 'none'

export type QuarterView = Readonly<{
  quarter: Quarter
  past: boolean
  longBreak: Run | null
  /** §3.5: 節の札。あり、まだ（これからの四半期で無い）、なし（過ぎた四半期で無かった） */
  longBreakStatus: LongBreakStatus
  months: readonly MonthView[]
  marks: readonly DayMark[]
  grantNote: GrantNote | null
  /** 有休の候補の組（R-7 の順） */
  groups: readonly CandidateGroupView[]
  /** 祝日のない月の候補（月の早い順）。§3.7 で 1 枚のカードにまとめる */
  monthGaps: readonly MonthGapBlock[]
  /** まとめて取る休暇の組。種類の並びは設定画面と同じ（§3.7） */
  together: readonly TogetherBlock[]
  /** groups、monthGaps、together がどれも空（§3.7） */
  noCandidates: boolean
  entries: readonly EntryBlock[]
}>

// ---- 月カレンダー ----

function markOf(ctx: Ctx, d: IsoDate, candidateDays: ReadonlySet<IsoDate>): DayMark | null {
  const entry = entryMarkOf(ctx, d)
  if (entry !== null) return entry
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
        taken: isTaken(entry, input.today),
        overlap: kind !== null && kind !== 'leave',
        run,
        long: isLongRun(run),
        leaveTypeName: entry.leaveTypeId === PAID_LEAVE_TYPE_ID ? null : (input.settings.leaveTypes.find((t) => t.id === entry.leaveTypeId)?.name ?? null),
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
  const ctx = ctxOf(input)
  const active = quarters.filter((q) => q.end >= input.today)
  const placed = candidateBlocks(ctx, active)
  const togetherPlaced = togetherBlocks(ctx, active)
  const none = new Set<IsoDate>()

  return quarters.map((quarter) => {
    const past = quarter.end < input.today
    const months = monthsOf(quarter).map((m) => monthView(ctx, m, past ? none : placed.primaryDays))
    const shown = new Set(months.flatMap((m) => m.weeks.flat()).map((c) => c?.mark ?? null))
    const inQuarter = <B>(list: readonly Placed<B>[]): B[] =>
      past ? [] : list.filter((p) => p.quarterStart === quarter.start).map((p) => p.block)
    const groups = inQuarter(placed.groups)
    const monthGaps = inQuarter(placed.monthGaps)
    const together = inQuarter(togetherPlaced)
    const longBreak = longBreakOf(ctx.cal, quarter)
    return {
      quarter,
      past,
      longBreak,
      longBreakStatus: longBreak !== null ? 'has' : past ? 'none' : 'notYet',
      months,
      marks: MARK_ORDER.filter((m) => shown.has(m)),
      grantNote: grantNoteOf(ctx, quarter),
      groups,
      monthGaps,
      together,
      noCandidates: groups.length === 0 && monthGaps.length === 0 && together.length === 0,
      entries: entryBlocks(ctx, quarter),
    }
  })
}
