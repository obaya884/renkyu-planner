import { isValidCompanyHoliday } from '../calendar/companyHoliday'
import { MAX_RUN_DAYS, type RestCalendar, type RestKind, type Run, inCompanyHoliday, runContaining } from '../calendar/restDays'
import { type Candidate, findCandidates } from '../candidates/findCandidates'
import { groupCandidates } from '../candidates/groupCandidates'
import { monthGaps } from '../candidates/monthGap'
import { isShort } from '../leave/amount'
import { type UsageTable, grantYearOfType, usageTableOf } from '../leave/balance'
import { isTaken } from '../leave/taken'
import type { Quarter } from '../quarters/quarters'
import { type IsoDate, addDays, eachDay } from '../shared/date'
import type { Entry } from '../types'
import { previewAdd } from './addPreview'
import { defaultLeaveTypeId } from './defaultLeaveType'
import { type PlannerInput, restCalendarOf } from './input'

/** §3.7: 日の並びの 1 マスの種類。take は休む日、done・planned は日程のある日（§3.6 の取得済み・予定）、company は会社の休日、off は土日・祝日 */
export type StripKind = 'take' | 'done' | 'planned' | 'company' | 'off'
export type StripDay = Readonly<{ date: IsoDate; kind: StripKind }>
/** §3.7: 連休の日の並び。連休が SMALL_STRIP_DAYS 日以上なら small（小さいマス。収まらなければ折り返す） */
export type Strip = Readonly<{ size: 'normal' | 'small'; days: readonly StripDay[] }>

const SMALL_STRIP_DAYS = 10

export type EntryMark = 'done' | 'planned'

/** §3.6・R-13: 日付ごとの日程の印。日程のある日が、今日以前なら done、今日より後なら planned。日程の無い日は持たない */
function entryMarksOf(entries: readonly Entry[], today: IsoDate): ReadonlyMap<IsoDate, EntryMark> {
  const marks = new Map<IsoDate, EntryMark>()
  for (const e of entries) marks.set(e.date, isTaken(e, today) ? 'done' : 'planned')
  return marks
}

/** §3.6: その日の日程の印。取得済みなら done、予定なら planned、日程が無ければ null。月カレンダーと日の並びで共通 */
export function entryMarkOf(ctx: Ctx, d: IsoDate): EntryMark | null {
  return ctx.entryMarks.get(d) ?? null
}

/** §3.7: run の日を、休む日、日程のある日、会社の休日、土日・祝日に分ける。重なったときは §3.6 の順（休む日には日程が無い。R-4） */
export function stripOf(ctx: Ctx, leaveDays: readonly IsoDate[], run: Run): Strip {
  const take = new Set(leaveDays)
  const days = eachDay(run.start, run.end).map((date): StripDay => {
    if (take.has(date)) return { date, kind: 'take' }
    const entry = entryMarkOf(ctx, date)
    if (entry !== null) return { date, kind: entry }
    return { date, kind: ctx.cal.kindOf(date) === 'company' ? 'company' : 'off' }
  })
  return { size: days.length >= SMALL_STRIP_DAYS ? 'small' : 'normal', days }
}

/** §3.7・要件定義書 §5.1: 組の見出しに出す核。会社の休日は、核の前後に続く会社の休日の期間と、核を含む会社の休日の名前（無ければ null） */
export type CoreHead = Readonly<
  | { kind: 'holiday'; date: IsoDate; name: string }
  | { kind: 'company'; start: IsoDate; end: IsoDate; name: string | null }
  | { kind: 'other'; date: IsoDate }
>

/** 要件定義書 §5.1。核の日の種類は R-1 の順（会社の休日が祝日より先）。会社の休日の期間を伸ばすのは R-2 と同じく MAX_RUN_DAYS 日まで */
export function coreHeadOf(ctx: Ctx, core: IsoDate): CoreHead {
  const { cal, input } = ctx
  const kind = cal.kindOf(core)
  if (kind === 'company') {
    const isCompany = (d: IsoDate) => cal.kindOf(d) === 'company'
    let start = core
    let end = core
    let days = 1
    while (days < MAX_RUN_DAYS && isCompany(addDays(start, -1))) {
      start = addDays(start, -1)
      days++
    }
    while (days < MAX_RUN_DAYS && isCompany(addDays(end, 1))) {
      end = addDays(end, 1)
      days++
    }
    const holiday = input.settings.companyHolidays.filter(isValidCompanyHoliday).find((h) => inCompanyHoliday(h, core))
    return { kind: 'company', start, end, name: holiday?.name ?? null }
  }
  if (kind === 'holiday') return { kind: 'holiday', date: core, name: input.holidays.holidays[core] }
  return { kind: 'other', date: core }
}

export type CandidateRow = Readonly<{
  leaveDays: readonly IsoDate[]
  run: Run
  /** 連休の日の並び（§3.7） */
  strip: Strip
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

/** 同じ核の候補の組（R-5）。head は見出しの元（§3.7） */
export type CandidateGroupView = Readonly<{ core: IsoDate; head: CoreHead; primary: readonly CandidateRow[]; rest: readonly CandidateRow[]; restHasLong: boolean }>
/** 祝日のない月の候補（R-8） */
export type MonthGapBlock = Readonly<{ month: IsoDate; unconfirmed: boolean; runDays: number; rows: readonly CandidateRow[] }>

const LONG_RUN_DAYS = 5

/** 連休が長め（5 日以上）か。連休の長めはここで 1 つに決める */
export const isLongRun = (run: Run | null): boolean => run !== null && run.days >= LONG_RUN_DAYS

/** 組み立て 1 回ぶんの共通の値。cal、entryMarks、usage（付与年ごとの取得済みと予定）は input から 1 度だけ作る（ctxOf） */
export type Ctx = Readonly<{ input: PlannerInput; cal: RestCalendar; entryMarks: ReadonlyMap<IsoDate, EntryMark>; usage: UsageTable }>

export function ctxOf(input: PlannerInput): Ctx {
  return { input, cal: restCalendarOf(input), entryMarks: entryMarksOf(input.entries, input.today), usage: usageTableOf(input.settings, input.entries, input.today) }
}

/** leaveDays をその種類の 1 日分の予定として足したときの、不足している付与年の不足の合計。モーダル（previewAdd）と同じ数え方（§3.7） */
function shortMinutesOf(ctx: Ctx, leaveDays: readonly IsoDate[], leaveTypeId: string): number | null {
  let short = 0
  for (const { after } of previewAdd(ctx.input, leaveDays, leaveTypeId, ctx.usage)) if (isShort(after)) short += -after
  return short > 0 ? short : null
}

/** F-209・§3.7: その種類の、今日が入る付与年の次の付与年の日を含むか。付与日が未設定なら false */
export function inNextGrantYear(input: PlannerInput, leaveDays: readonly IsoDate[], leaveTypeId: string): boolean {
  const current = grantYearOfType(input.settings, leaveTypeId, input.today)
  return current !== null && leaveDays.some((d) => d > current.end)
}

function rowOf(ctx: Ctx, leaveDays: readonly IsoDate[], run: Run, long: boolean, unconfirmed: boolean): CandidateRow {
  const { input } = ctx
  const leaveTypeId = defaultLeaveTypeId(input, leaveDays, ctx.usage)
  return {
    leaveDays,
    run,
    strip: stripOf(ctx, leaveDays, run),
    long,
    unconfirmed,
    leaveTypeId,
    // defaultLeaveTypeId は leaveTypes の中の id を返すので、名前は見つかる（leaveTypes が空のときだけ ''）
    leaveTypeName: input.settings.leaveTypes.find((t) => t.id === leaveTypeId)?.name ?? '',
    nextGrantYear: inNextGrantYear(input, leaveDays, leaveTypeId),
    shortMinutes: shortMinutesOf(ctx, leaveDays, leaveTypeId),
  }
}

const candidateRow = (ctx: Ctx, c: Candidate) => rowOf(ctx, c.leaveDays, c.run, c.long, c.unconfirmed)

/** d を休みの日に足したカレンダーで、d を含む連休 */
function runWithLeave(cal: RestCalendar, d: IsoDate): Run | null {
  const kindOf = (x: IsoDate): RestKind | null => (x === d ? 'leave' : cal.kindOf(x))
  return runContaining({ kindOf, isRest: (x) => kindOf(x) !== null }, d)
}

export type Placed<B> = Readonly<{ quarterStart: IsoDate; block: B }>

/** 過ぎていない四半期の最初の日から最後の日までを 1 回で列挙し、四半期ごとに置く組と祝日のない月（R-5〜R-10） */
export function candidateBlocks(ctx: Ctx, active: readonly Quarter[]): { groups: Placed<CandidateGroupView>[]; monthGaps: Placed<MonthGapBlock>[]; primaryDays: Set<IsoDate> } {
  const groups: Placed<CandidateGroupView>[] = []
  const gaps: Placed<MonthGapBlock>[] = []
  const primaryDays = new Set<IsoDate>()
  if (active.length === 0) return { groups, monthGaps: gaps, primaryDays }
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
    groups.push({
      quarterStart: g.quarterStart,
      block: { core: g.core, head: coreHeadOf(ctx, g.core), primary, rest, restHasLong: rest.some((r) => r.long) },
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
    if (quarter) gaps.push({ quarterStart: quarter.start, block: { month: gap.month, unconfirmed: gap.unconfirmed, runDays, rows } })
  }
  return { groups, monthGaps: gaps, primaryDays }
}
