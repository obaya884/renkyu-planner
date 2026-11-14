import { buildRestCalendar } from '@/domain/calendar/restDays'
import { type Candidate, findCandidates } from '@/domain/candidates/findCandidates'
import { type CandidateGroup, groupCandidates } from '@/domain/candidates/groupCandidates'
import type { HolidayData } from '@/domain/holidays/importCsv'
import type { IsoDate } from '@/domain/shared/date'
import { weekday } from '@/domain/shared/date'

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

const monthDay = (d: IsoDate) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`

/** N-04。ビルドした年の 1 月 1 日から、翌年末と confirmedUntil の早いほうまで。設定なし（土日と祝日だけ） */
export function staticCandidateGroups(data: HolidayData, buildDay: IsoDate): CandidateGroup[] {
  const year = Number(buildDay.slice(0, 4))
  const start = `${year}-01-01`
  const nextYearEnd = `${year + 1}-12-31`
  const end = nextYearEnd < data.confirmedUntil ? nextYearEnd : data.confirmedUntil
  const cal = buildRestCalendar({ holidays: data.holidays, companyHolidays: [], entries: [] })
  const candidates = findCandidates({
    cal,
    entryDates: new Set(),
    today: start,
    start,
    end,
    confirmedUntil: data.confirmedUntil,
  })
  return groupCandidates(candidates)
}

/** 例: 11/2(月) を休むと 4 連休（10/31〜11/3） */
export function describeCandidate(c: Candidate): string {
  const leave = c.leaveDays.map((d) => `${monthDay(d)}(${WEEKDAY_NAMES[weekday(d)]})`).join('・')
  return `${leave} を休むと ${c.run.days} 連休（${monthDay(c.run.start)}〜${monthDay(c.run.end)}）`
}

/** 組の中で効率（連休の日数 ÷ 休む日数）が最大のもの。同じなら休む日数の少ないもの。比較は掛け算で行う */
export function bestCandidate(group: CandidateGroup): Candidate {
  return group.candidates.reduce((best, c) => {
    const diff = c.run.days * best.leaveDays.length - best.run.days * c.leaveDays.length
    return diff > 0 || (diff === 0 && c.leaveDays.length < best.leaveDays.length) ? c : best
  })
}

/** 例: 2026年 10〜12月 */
export function quarterHeading(quarterStart: IsoDate): string {
  const m = Number(quarterStart.slice(5, 7))
  return `${quarterStart.slice(0, 4)}年 ${m}〜${m + 2}月`
}

/** 例: 2027年12月31日 */
export function formatJapaneseDate(d: IsoDate): string {
  return `${d.slice(0, 4)}年${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日`
}
