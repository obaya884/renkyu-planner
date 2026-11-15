import type { Run } from '../calendar/restDays'
import { type TogetherWindow, findTogetherCandidates, togetherWindowsOf } from '../candidates/togetherCandidates'
import { lastAddableDate } from '../entries/checkDraft'
import type { Quarter } from '../quarters/quarters'
import { type IsoDate, addDays } from '../shared/date'
import { type Ctx, type Strip, inNextGrantYear, isLongRun, stripOf } from './candidateBlocks'

export type TogetherRow = Readonly<{
  leaveDays: readonly IsoDate[]
  run: Run
  /** 連休の日の並び（§3.7） */
  strip: Strip
  long: boolean
  /** 連休の翌日が祝日データの確定期限より後（R-9 と同じ判定） */
  unconfirmed: boolean
  /** その種類の、今日が入る付与年より後の日を含む */
  nextGrantYear: boolean
}>

/** days は種類の日数 N。primary は四半期の先頭の 1 件、rest は残り */
export type TogetherBlock = Readonly<{ leaveTypeId: string; leaveTypeName: string; days: number; primary: TogetherRow; rest: readonly TogetherRow[] }>

/** R-20・§3.7: 設定画面の種類の並びで、種類ごとに候補を列挙して四半期に置く。active に入らない四半期の分は捨てる */
export function togetherBlocks(ctx: Ctx, active: readonly Quarter[]): readonly Readonly<{ quarterStart: IsoDate; block: TogetherBlock }>[] {
  const { input, cal } = ctx
  const starts = new Set(active.map((q) => q.start))
  const end = lastAddableDate(input.today)
  const placed: { quarterStart: IsoDate; block: TogetherBlock }[] = []
  // 休む日と連休は日数だけで決まるので、同じ日数の種類では組み立て 1 回につき 1 度だけ数える
  const windows = new Map<number, readonly TogetherWindow[]>()
  const windowsOf = (n: number): readonly TogetherWindow[] => {
    const found = windows.get(n)
    if (found !== undefined) return found
    const made = togetherWindowsOf(cal, n, input.today, end)
    windows.set(n, made)
    return made
  }
  for (const type of input.settings.leaveTypes) {
    const quarters = findTogetherCandidates({ cal, settings: input.settings, entries: input.entries, leaveTypeId: type.id, today: input.today, end, windowsOf })
    for (const { quarterStart, candidates } of quarters) {
      if (!starts.has(quarterStart) || candidates.length === 0) continue
      const rows = candidates.map((c): TogetherRow => ({
        leaveDays: c.leaveDays,
        run: c.run,
        strip: stripOf(ctx, c.leaveDays, c.run),
        long: isLongRun(c.run),
        unconfirmed: addDays(c.run.end, 1) > input.holidays.confirmedUntil,
        nextGrantYear: inNextGrantYear(input, c.leaveDays, type.id),
      }))
      placed.push({ quarterStart, block: { leaveTypeId: type.id, leaveTypeName: type.name, days: type.days, primary: rows[0], rest: rows.slice(1) } })
    }
  }
  return placed
}
