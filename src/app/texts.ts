import type { Run } from '@/domain/calendar/restDays'
import type { Candidate } from '@/domain/candidates/findCandidates'
import type { DraftError, GrantError } from '@/domain/entries/checkDraft'
import { formatMinutes, isShort, toMinutes } from '@/domain/leave/amount'
import type { Amount } from '@/domain/types'
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
  // §3.4〜§3.8
  back: '‹ 前',
  forward: '次 ›',
  tabsLabel: '四半期',
  candidates: '候補',
  noCandidates: 'この四半期の候補はありません',
  restHasLong: '長めあり',
  enterGrant: '日数を入れる',
  noLongBreak: 'まだない',
  done: '取得済み',
  legendOff: '土日・祝日',
  legendCompany: '会社の休日',
  viewPast: '過ぎた四半期の記録を見る',
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
  // §5 共通
  save: '保存する',
  cancel: 'やめる',
  // §5.1
  submitAdd: '予定に入れる',
  restDays: '休む日',
  runLabel: '連休',
  leaveTypeLabel: '引く休暇',
  entryTitleLabel: '予定の名前',
  thisGrantYear: '今の付与年',
  nextGrantYearLabel: '次の付与年',
  enterGrantToSee: '付与日と日数を入れると、残りが出ます',
  // §5.2
  addDayTitle: '日を足す',
  dateLabel: '日付',
  amountLabel: '量',
  amountDay: '1日',
  amountHalf: '半日',
  amountMinutes: '時間で入れる',
  hoursUnit: '時間',
  minutesUnit: '分',
  statusLabel: '状態',
  remove: 'この日程を消す',
  // §5.3
  grantTitle: '有休の付与日と日数',
  grantDayLabel: '付与日',
  monthUnit: '月',
  dayUnit: '日',
  grantDaysLabel: '付与日数',
  carryOverLabel: '前の年からの繰り越し',
  submitGrantFirst: '残りを出す',
  // §8.3
  overOneDay: 'この日の合計が 1日を超えています',
} as const

/** 日曜始まり。月カレンダーの曜日の行にも使う */
export const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'] as const

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

/** 月カレンダーの見出し。例: 11月 */
export function monthCaption(month: IsoDate): string {
  return `${Number(month.slice(5, 7))}月`
}

/** タブの上の行。例: 2026年 */
export function yearLabel(d: IsoDate): string {
  return `${d.slice(0, 4)}年`
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

/** 日程の量（1 日・半日・分）。例: 1 日、2 時間 */
export function amountText(amount: Amount, workMinutes: number): string {
  return formatAmount(toMinutes(amount, workMinutes), workMinutes)
}

/** §3.7 のまとめた行。例: 2 日以上休む取り方（7） */
export function restSummary(count: number): string {
  return `2 日以上休む取り方（${count}）`
}

/** §3.7 の祝日のない月の行。例: 12月は祝日がありません。金曜か月曜を休むと 3連休（8） */
export function monthGapSummary(month: IsoDate, runDays: number, count: number): string {
  return `${Number(month.slice(5, 7))}月は祝日がありません。金曜か月曜を休むと ${runDays}連休（${count}）`
}

/** §3.7 の 2 行目。例: 2日使う */
export function leaveDaysUsed(days: number): string {
  return `${days}日使う`
}

/** F-211。例: 有休が 6 時間足りません */
export function shortText(minutes: number, workMinutes: number): string {
  return `有休が ${formatAmount(minutes, workMinutes)}足りません`
}

/** §3.8 の連休の見出し・添え書き。例: 12/26〜1/3 の 9連休 */
export function runHeading(run: Run): string {
  return `${formatPeriod(run)} の ${run.days}連休`
}

/** §3.5。例: 長めの休暇: 12/26〜1/3（9連休） */
export function longBreakLine(run: Run | null): string {
  return `${T.longBreak}: ${run === null ? T.noLongBreak : `${formatPeriod(run)}（${run.days}連休）`}`
}

/** §3.6 の付与日の 1 行。例: 5/1 から次の付与年（前の年と同じ 14日で計算中） */
export function grantNoteText(date: IsoDate, entered: boolean, grantDays: number): string {
  const head = `${monthDay(date)} から次の付与年`
  return entered ? `${head}（有休 ${grantDays}日）` : `${head}（前の年と同じ ${grantDays}日で計算中）`
}

/** §3.4 の持ち分の 1 行。例: 有休 残り 9 日と 2 時間・未割り当て 4 日と 2 時間。不足なら「不足 6 時間」 */
export function summaryLine(name: string, remaining: number, unassigned: number, short: boolean, workMinutes: number): string {
  const rest = short ? `${T.short} ${formatAmount(unassigned, workMinutes)}` : `${T.unassigned} ${formatAmount(Math.max(0, unassigned), workMinutes)}`
  return `${remainingLabel(name)} ${formatAmount(remaining, workMinutes)}・${rest}`
}

/** §5.1 の未割り当ての 1 行の片側。不足（isShort）なら「不足 ◯」。例: 3 日と 2 時間、不足 1 日 */
export function unassignedText(minutes: number, workMinutes: number): string {
  return isShort(minutes) ? `${T.short} ${formatAmount(minutes, workMinutes)}` : formatAmount(Math.max(0, minutes), workMinutes)
}

/** §5.1 の未割り当ての 1 行。例: 未割り当て 4 日と 2 時間 → 3 日と 2 時間。ラベルは 1 行のときは未割り当て、2 行のときは付与年 */
export function unassignedChange(label: string, before: number, after: number, workMinutes: number): string {
  return `${label} ${unassignedText(before, workMinutes)} → ${unassignedText(after, workMinutes)}`
}

/** §5.1 の休む日の行。例: 11/20(金)・11/23(月) 2 日 */
export function restDaysText(days: readonly IsoDate[], workMinutes: number): string {
  return `${days.map(formatDay).join('・')} ${formatAmount(days.length * workMinutes, workMinutes)}`
}

/** §5.1 の引く休暇。例: 有休（残り 9 日と 2 時間） */
export function leaveTypeWithRemaining(name: string, remaining: number, workMinutes: number): string {
  return `${name}（${T.remaining} ${unassignedText(remaining, workMinutes)}）`
}

/** §5.2 の題。例: 12/28(月) の日程 */
export function entrySheetTitle(d: IsoDate): string {
  return `${formatDay(d)} の日程`
}

/** §5.3 の題の下。例: 2027/5/1〜2028/4/30 の分 */
export function grantPeriodText(start: IsoDate, end: IsoDate): string {
  const ymd = (d: IsoDate) => `${d.slice(0, 4)}/${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
  return `${ymd(start)}〜${ymd(end)} の分`
}

/** §5.3 の付与日の文字。例: 5月1日 */
export function grantDayText(md: MonthDay): string {
  return `${Number(md.slice(0, 2))}月${Number(md.slice(3, 5))}日`
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
