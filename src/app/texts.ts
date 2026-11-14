import type { Run } from '@/domain/calendar/restDays'
import type { Candidate } from '@/domain/candidates/findCandidates'
import type { DraftError, GrantError } from '@/domain/entries/checkDraft'
import { formatMinutes } from '@/domain/leave/amount'
import type { IsoDate } from '@/domain/shared/date'
import { weekday } from '@/domain/shared/date'

/** 画面に出す固定の文言（P-6、画面定義書 §8.1）。文言はすべて仮。計画 3 でまとめて直す */
export const T = {
  // §3.5〜§3.8
  addToPlan: '日程に入れる',
  entries: '日程',
  addDay: '＋ 日を足す',
  noEntries: 'まだありません',
  long: '長め',
  unconfirmed: '祝日が未確定',
  nextGrantYear: '次の付与年から引く',
  overdue: '日付を過ぎています',
  markDone: '取得済みにする',
  overlap: '休みの日と重なっています',
  // §3.11、§5.3
  cannotSave: 'このブラウザでは記録を保存できません。閉じると、入れた内容は消えます。',
  localOnly: '入れた内容は、このブラウザの中にだけ保存します。運営には送られません。',
  // D-5 の文
  unreadable: '保存されていた記録を読めませんでした',
  // §8.3
  overOneDay: 'この日の合計が 1日を超えています',
} as const

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

const monthDay = (d: IsoDate) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`

/** 例: 11/2(月) */
export function formatDay(d: IsoDate): string {
  return `${monthDay(d)}(${WEEKDAY_NAMES[weekday(d)]})`
}

/** 例: 10/31〜11/3 */
export function formatPeriod(run: Run): string {
  return `${monthDay(run.start)}〜${monthDay(run.end)}`
}

/** 例: 2027年12月31日 */
export function formatJapaneseDate(d: IsoDate): string {
  return `${d.slice(0, 4)}年${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日`
}

/** 例: 2026年 10〜12月 */
export function quarterHeading(quarterStart: IsoDate): string {
  const m = Number(quarterStart.slice(5, 7))
  return `${quarterStart.slice(0, 4)}年 ${m}〜${m + 2}月`
}

type CandidateLike = Pick<Candidate, 'leaveDays' | 'run'>

/** 静的な一覧用。例: 11/2(月) を休むと 4 連休（10/31〜11/3） */
export function describeCandidate(c: CandidateLike): string {
  return `${c.leaveDays.map(formatDay).join('・')} を休むと ${c.run.days} 連休（${formatPeriod(c.run)}）`
}

/** 主な画面用で、期間を含まない。例: 11/20(金) を休むと 4連休 */
export function candidateText(c: CandidateLike): string {
  return `${c.leaveDays.map(formatDay).join('・')} を休むと ${c.run.days}連休`
}

/** R-11 の形のまま */
export function formatAmount(minutes: number, workMinutes: number): string {
  return formatMinutes(minutes, workMinutes)
}

/** 画面定義書 §8.3。restDay と invalidGrantDay 以外は §8.3 にない仮の文 */
export function errorText(e: DraftError | GrantError): string {
  switch (e) {
    case 'restDay':
      return 'この日は休みの日です。休みの日には入れられません'
    case 'invalidGrantDay':
      return '2月29日は付与日にできません'
    case 'invalidDate':
      return '日付を正しく入れてください'
    case 'invalidAmount':
      return '時間は、1分以上、1日の所定労働時間以内で入れてください'
    case 'unknownLeaveType':
      return '引く休暇を選んでください'
    case 'invalidGrantDays':
      return '付与日数は、0日から366日まで、0.5日きざみで入れてください'
    case 'invalidCarryOver':
      return '繰り越しは、0以上で入れてください'
  }
}
