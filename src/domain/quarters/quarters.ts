import { type RestCalendar, type Run, restRuns } from '../calendar/restDays'
import { type IsoDate, addDays, quarterEnd, quarterStart } from '../shared/date'

export type Quarter = Readonly<{ start: IsoDate; end: IsoDate; label: string }>

/** 四半期の初日から四半期を作る */
export function quarterOf(start: IsoDate): Quarter {
  const [y, m] = start.split('-').map(Number)
  return { start, end: quarterEnd(start), label: `${y}年 ${m}〜${m + 2}月` }
}

/** 今日が入る四半期から 4 つ（R-10）。`shift` の四半期ぶんだけ始まりをずらす（−1 なら 1 つ前から） */
export function planningQuarters(today: IsoDate, shift = 0): Quarter[] {
  const quarters: Quarter[] = []
  let start = quarterStart(today)
  for (let i = 0; i < Math.abs(shift); i++) {
    start = shift < 0 ? quarterStart(addDays(start, -1)) : addDays(quarterEnd(start), 1)
  }
  for (let i = 0; i < 4; i++) {
    const q = quarterOf(start)
    quarters.push(q)
    start = addDays(q.end, 1)
  }
  return quarters
}

/**
 * PC の並び（§4）。今日が入る四半期から `-shift` だけ前の四半期を先頭に、今日の四半期の 3 つ先までを、
 * 抜けなく早い順に返す。`shift` は 0 以下の整数（0 なら 4 つ、−5 なら 9 つ）。スマホのタブはこの先頭から 4 つ
 */
export function quartersBetween(today: IsoDate, shift: number): Quarter[] {
  const quarters: Quarter[] = []
  let start = planningQuarters(today, shift)[0].start
  const last = planningQuarters(today)[3].start
  while (start <= last) {
    const q = quarterOf(start)
    quarters.push(q)
    start = addDays(q.end, 1)
  }
  return quarters
}

/**
 * §3.4・§4: 前へ動けるか（「‹ 前」と「過ぎた四半期の記録を見る」を出す条件）。見えている最初の四半期の初日より前に、
 * 日程がある、または今日が入る付与年の開始日がある（付与日が未設定なら grantYearStart は null で、日程だけを見る）
 */
export function canGoBack(dates: readonly IsoDate[], grantYearStart: IsoDate | null, first: Quarter): boolean {
  return dates.some((d) => d < first.start) || (grantYearStart !== null && grantYearStart < first.start)
}

/** 開始日がその四半期に入る 5 日以上の連休のうち、最も長いもの。同じ長さなら早いもの（R-14） */
export function longBreakOf(cal: RestCalendar, q: Quarter): Run | null {
  let best: Run | null = null
  for (const run of restRuns(cal, q.start, q.end)) {
    // 前の四半期から続く連休は、開始日がこの四半期に入らないので数えない
    if (run.start >= q.start && run.days >= 5 && (best === null || run.days > best.days)) best = run
  }
  return best
}
