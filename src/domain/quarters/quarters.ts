import { type RestCalendar, type Run, restRuns } from '../calendar/restDays'
import { type IsoDate, addDays, quarterEnd, quarterStart } from '../shared/date'

export type Quarter = Readonly<{ start: IsoDate; end: IsoDate; label: string }>

function quarterOf(start: IsoDate): Quarter {
  const [y, m] = start.split('-').map(Number)
  return { start, end: quarterEnd(start), label: `${y}年 ${m}〜${m + 2}月` }
}

/** 今日が入る四半期から 4 つ（R-10） */
export function planningQuarters(today: IsoDate): Quarter[] {
  const quarters: Quarter[] = []
  let start = quarterStart(today)
  for (let i = 0; i < 4; i++) {
    const q = quarterOf(start)
    quarters.push(q)
    start = addDays(q.end, 1)
  }
  return quarters
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
