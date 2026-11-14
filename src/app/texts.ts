import type { Run } from '@/domain/calendar/restDays'
import type { Candidate } from '@/domain/candidates/findCandidates'
import type { DraftError, GrantError } from '@/domain/entries/checkDraft'
import { formatMinutes } from '@/domain/leave/amount'
import type { IsoDate, MonthDay } from '@/domain/shared/date'
import { weekday } from '@/domain/shared/date'

/** 画面に出す固定の文言（P-6、画面定義書 §8.1）。文言はすべて仮。計画 3 でまとめて直す */
export const T = {
  // §3.2
  remaining: '残り',
  planned: '予定',
  unassigned: '未割り当て',
  short: '不足',
  usedUp: '使い切り',
  fiveDaysLabel: '年 5 日の取得まで',
  // §3.3
  longBreak: '長めの休暇',
  longBreakHolidaysOnly: '（土日と祝日だけで計算）',
  has: 'あり',
  notYet: 'まだ',
  // §3.9
  inviteTitle: '有休の残りを出す',
  inviteBody: '付与日と日数を入れると、残りと、まだ日を決めていない日数が出ます',
  inviteButton: '付与日と日数を入れる',
  // 最初の HTML の一覧（N-04。見出しは画面定義書にない仮）
  staticCandidatesHeading: '連休の候補',
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

/** 長めの休暇の札と、使える期間に使う。例: 10〜12月 */
export function monthRange(startMonth: number, endMonth: number): string {
  return `${startMonth}〜${endMonth}月`
}

/** 四半期の初日から、月だけの書き方。例: 10〜12月 */
export function quarterMonths(quarterStart: IsoDate): string {
  const m = Number(quarterStart.slice(5, 7))
  return monthRange(m, m + 2)
}

const MONTH_LAST_DAY = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** 使える期間（§3.2）。月の初めから月の終わりまでなら「7〜9月」、そうでなければ「7/15〜9/30」 */
export function usablePeriod(start: MonthDay, end: MonthDay): string {
  const [sm, sd] = start.split('-').map(Number)
  const [em, ed] = end.split('-').map(Number)
  const wholeMonths = sd === 1 && (ed === MONTH_LAST_DAY[em - 1] || (em === 2 && ed === 28))
  return wholeMonths ? monthRange(sm, em) : `${sm}/${sd}〜${em}/${ed}`
}

/** §3.2 の 1 行目。例: 有休 残り */
export function remainingLabel(leaveTypeName: string): string {
  return `${leaveTypeName} ${T.remaining}`
}

/** §3.2 の 3 行目の量の部分。例: 予定 2 日・未割り当て 7 日と 2 時間。不足なら「不足 6 時間」 */
export function balanceDetail(planned: number, unassigned: number, short: boolean, workMinutes: number): string {
  const rest = short ? `${T.short} ${formatAmount(unassigned, workMinutes)}` : `${T.unassigned} ${formatAmount(Math.max(0, unassigned), workMinutes)}`
  return `${T.planned} ${formatAmount(planned, workMinutes)}・${rest}`
}

/** F-404。例: 年 5 日の取得まで あと 3日（取得済み 2日・予定 0日） */
export function fiveDaysText(remainingDays: number, doneDays: number, plannedDays: number): string {
  return `${T.fiveDaysLabel} あと ${remainingDays}日（取得済み ${doneDays}日・${T.planned} ${plannedDays}日）`
}

/** §3.3 の札。例: 10〜12月 あり */
export function longBreakChip(quarterStart: IsoDate, has: boolean): string {
  return `${quarterMonths(quarterStart)} ${has ? T.has : T.notYet}`
}

/** §3.10。例: 祝日は内閣府の公表データです。2027年12月31日まで確定。 */
export function holidayNote(confirmedUntil: IsoDate): string {
  return `祝日は内閣府の公表データです。${formatJapaneseDate(confirmedUntil)}まで確定。`
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
