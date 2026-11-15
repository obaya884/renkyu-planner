import type { Run } from '@/domain/calendar/restDays'
import type { Candidate } from '@/domain/candidates/findCandidates'
import type { DraftError, GrantError } from '@/domain/entries/checkDraft'
import type { RangeError } from '@/domain/entries/entryRange'
import type { CompanyHolidayError, LeaveTypeError } from '@/domain/entries/settingsInput'
import { formatMinutes, isShort, toMinutes } from '@/domain/leave/amount'
import type { Amount, CompanyHoliday, Entry, LeaveType, WeekStart } from '@/domain/types'
import type { IsoDate, MonthDay } from '@/domain/shared/date'
import { isBlankEventName } from '@/domain/transfer/eventText'
import type { ImportCounts } from '@/domain/transfer/importCounts'
import type { GrantYearPosition } from '@/domain/view/addPreview'
import type { CandidateRow, CoreHead, TogetherRow } from '@/domain/view/quarterView'
import type { GrantYearRow } from '@/domain/view/settingsView'
import { weekday } from '@/domain/shared/date'

/** 画面に出す固定の文言（P-6、画面定義書 §8.1）。文言はすべて仮。計画 5（V-1）でまとめて直す */
export const T = {
  // §3.1、§6、§3.10
  settings: '設定',
  backToMain: '‹ 戻る',
  rowChevron: '›',
  holidayMore: 'くわしく',
  aboutHolidays: '祝日について',
  settingsPageTitle: '設定｜連休プランナー',
  workMinutesLabel: '1 日の所定労働時間',
  calendarLabel: 'カレンダー',
  weekStartLabel: '週の始まり',
  paidSection: '有休',
  grantDayRowLabel: '付与日',
  viewPastGrantYears: '過ぎた付与年を見る',
  grantDayUnset: 'まだ入れていません',
  companyHolidaySection: '会社の休日',
  companyHolidayHint: '会社が決めた、全員が休む日。年末年始の休業など',
  addCompanyHoliday: '＋ 会社の休日を足す',
  companyHolidayTitle: '会社の休日',
  repeatLabel: '繰り返し',
  yearly: '毎年',
  once: 'その年だけ',
  startLabel: '開始',
  endLabel: '終了',
  removeCompanyHoliday: 'この休日を消す',
  leaveTypeSection: '休暇の種類',
  leaveTypeHint: '日数が決まっていて、休む日を自分で選ぶ休暇。夏季休暇など',
  addLeaveType: '＋ 休暇の種類を足す',
  leaveTypeTitle: '休暇の種類',
  nameLabel: '名前',
  companyHolidayNameLabel: '名前（任意）',
  leaveDaysLabel: '日数',
  usableLabel: '使える期間',
  setUsable: '使える期間を決める',
  leaveGrantDayLabel: '付与される日',
  /** M-5 の付与される日の 2 つ目のラジオ */
  leaveOwnGrantDay: '月と日で決める',
  /** M-5 の付与される日を月と日で決めるときの、月日の選択の見出し */
  leaveGrantDayPickerLabel: '付与される月日',
  sameAsPaid: '有休と同じ',
  togetherLabel: 'まとめて取る休暇',
  togetherHint: '営業日で連続して、全部の日数を 1 回で取る休暇',
  cannotRemovePaid: '消せません',
  removeLeaveType: 'この種類を消す',
  monday: '月曜',
  sunday: '日曜',
  // §3.2
  remaining: '残り',
  planned: '予定',
  unassigned: '未割り当て',
  short: '不足',
  usedUp: '使い切り',
  newGrantYear: '新しい年になりました。付与日数と使える日数を確かめる',
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
  // §3.7 候補のカード
  insert: '入れる',
  noHolidayMonths: '祝日のない月',
  unnamedCompanyHoliday: '会社の休日',
  more: '▾',
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
  calendarRowLabel: 'カレンダー',
  addToGoogleCalendar: 'Google カレンダーに追加',
  leaveTypeLabel: '引く休暇',
  entryTitleLabel: '予定の名前',
  thisGrantYear: '今の付与年',
  nextGrantYearLabel: '次の付与年',
  previousGrantYearLabel: '前の付与年',
  enterGrantToSee: '付与日と日数を入れると、残りが出ます',
  // §5.2
  addDayTitle: '日を足す',
  dateLabel: '日付',
  endDateLabel: '終わりの日',
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
  grantDaysLabel: '1 年に付与される日数',
  entitlementLabel: 'この年に使える日数',
  entitlementHint: '前の年から繰り越した分があれば、足した数に直してください',
  submitGrantFirst: '残りを出す',
  grantDayChangeNote: '付与日を変えると、ほかの年に入れた日数は消えます。日程は消えません',
  // §8.3
  overOneDay: 'この日の合計が 1日を超えています',
  // §6 記録の持ち出し、§5.6
  transferSection: '記録の持ち出し',
  exportFile: 'ファイルに書き出す',
  importFile: 'ファイルを読み込む',
  exportIcs: 'カレンダー用のファイル（.ics）を書き出す',
  clearAll: '記録をすべて消す',
  clearTitle: '記録をすべて消す',
  clearConfirm: '記録と設定をすべて消します。元に戻せません',
  clearHint: '消す前にファイルに書き出しておけば、あとで読み込んで戻せます',
  clearSubmit: '消す',
  transferNote: '記録は、このブラウザの中にだけ保存しています。運営には送られません。機種を変えるときや、ほかの端末で使うときは、ファイルに書き出して読み込んでください。',
  importTitle: 'ファイルを読み込む',
  importConfirm: 'いまの記録は置き換わります',
  importSubmit: '置き換える',
  restoreImport: '読み込む前に戻す',
  noCalendarEntries: 'カレンダーに入れる日程がありません',
} as const

/** §6 の記録の持ち出しの節に出す 1 行の種類 */
export type TransferNote = 'imported' | 'restored' | 'unreadableFile' | 'noCalendarEntries' | 'cleared'

/** 日曜始まり（曜日の番号の順）。月カレンダーの曜日の行は weekdayHeader を使う */
export const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'] as const

/** §3.6・F-108: 月カレンダーの曜日の行。週の始まりから並べる */
export function weekdayHeader(weekStart: WeekStart): readonly string[] {
  return weekStart === 'monday' ? [...WEEKDAY_NAMES.slice(1), WEEKDAY_NAMES[0]] : WEEKDAY_NAMES
}

const monthDay = (d: IsoDate) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`

/** 例: 11/2(月) */
export function formatDay(d: IsoDate): string {
  return `${monthDay(d)}(${WEEKDAY_NAMES[weekday(d)]})`
}

/** 例: 10/31〜11/3 */
export function formatPeriod(run: Run): string {
  return `${monthDay(run.start)}〜${monthDay(run.end)}`
}

/** §5.3 の次の付与年の、この年に使える日数。例: 16 日 ＋ 今の年の残り（いまは 4 日と 2 時間） */
export function nextEntitlementText(grantDays: number, carryOver: number, workMinutes: number): string {
  return `${formatMinutes(grantDays * workMinutes, workMinutes)} ＋ 今の年の残り（いまは ${formatMinutes(carryOver, workMinutes)}）`
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

/** §3.2 の足した休暇の 1 行（期間の前まで）。例: フリーバカンス　残り 5 日・未割り当て 5 日。使い切りなら「フリーバカンス　使い切り」 */
export function extraLeaveLine(name: string, remaining: number, unassigned: number, short: boolean, usedUp: boolean, workMinutes: number): string {
  if (usedUp) return `${name}　${T.usedUp}`
  const rest = short ? `${T.short} ${formatAmount(unassigned, workMinutes)}` : `${T.unassigned} ${formatAmount(Math.max(0, unassigned), workMinutes)}`
  return `${name}　${T.remaining} ${formatAmount(remaining, workMinutes)}・${rest}`
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

/** §6: 祝日の出所。内閣府の「国民の祝日について」のページ（CSV ではなく HTML） */
export const HOLIDAY_SOURCE_URL = 'https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html'

/** §6 の「祝日について」の文。link の部分を出所へのリンクにする。3 つをつなぐと 1 つの文になる */
export function holidayAboutParts(confirmedUntil: IsoDate): { before: string; link: string; after: string } {
  return {
    before: '祝日は',
    link: '内閣府の公表データ',
    after: `です。${formatJapaneseDate(confirmedUntil)}まで確定しています。それより先は未確定で、候補が変わることがあります。`,
  }
}

type CandidateLike = Pick<Candidate, 'leaveDays' | 'run'>

/** 静的な一覧用。例: 11/2(月) を休むと 4 連休（10/31〜11/3） */
export function describeCandidate(c: CandidateLike): string {
  return `${c.leaveDays.map(formatDay).join('・')} を休むと ${c.run.days} 連休（${formatPeriod(c.run)}）`
}

/** §3.7・§3.8 の 2 行目。語句を「・」でつなぐ。例: 11/20〜11/23・2日使う */
export function joinNotes(parts: readonly string[]): string {
  return parts.join('・')
}

/** 日程の量（1 日・半日・分）。例: 1 日、2 時間 */
export function amountText(amount: Amount, workMinutes: number): string {
  return formatAmount(toMinutes(amount, workMinutes), workMinutes)
}

/** §3.7 のまとめた行。例: もっと多く休む取り方（7） */
export function restSummary(count: number): string {
  return `もっと多く休む取り方（${count}）`
}

/** §3.7 の 2 行目。例: 2日使う */
export function leaveDaysUsed(days: number): string {
  return `${days}日使う`
}

/** F-211。名前は候補の行の引く休暇（F-208）。例: 有休が 6 時間足りません */
export function shortText(leaveTypeName: string, minutes: number, workMinutes: number): string {
  return `${leaveTypeName}が ${formatAmount(minutes, workMinutes)}足りません`
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

const GRANT_YEAR_LABELS: Readonly<Record<GrantYearPosition, string>> = {
  previous: T.previousGrantYearLabel,
  current: T.thisGrantYear,
  next: T.nextGrantYearLabel,
}

/** §5.1 の未割り当ての行の見出し。2 行以上なら、今日が入る付与年と比べた位置。1 行だけなら未割り当て。ただし前の付与年は、1 行でも「前の付与年」と出す */
export function unassignedLabel(position: GrantYearPosition, rows: number): string {
  return rows === 1 && position !== 'previous' ? T.unassigned : GRANT_YEAR_LABELS[position]
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

/** §5.2 の期間で足す日の行（F-307）。例: 12/28(月)・12/29(火)・1/4(月) の 3日ぶんを足します */
export function rangeDaysText(days: readonly IsoDate[]): string {
  return `${days.map(formatDay).join('・')} の ${days.length}日ぶんを足します`
}

/** §6 の付与年の期間。例: 2026/5/1〜2027/4/30 */
export function grantYearPeriod(start: IsoDate, end: IsoDate): string {
  const ymd = (d: IsoDate) => `${d.slice(0, 4)}/${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
  return `${ymd(start)}〜${ymd(end)}`
}

/** §5.3 の題の下。例: 2027/5/1〜2028/4/30 の分 */
export function grantPeriodText(start: IsoDate, end: IsoDate): string {
  return `${grantYearPeriod(start, end)} の分`
}

/** §6 の付与年の行の文。次の付与年で日数を入れていないときだけ、入力をうながす文になる */
export function grantYearRowText(row: GrantYearRow, isNext: boolean, workMinutes: number): string {
  if (isNext && !row.entered) return `日数を入れる（いまは ${row.grantDays}日で計算）`
  return `付与 ${row.grantDays}日・使える日数 ${formatMinutes(row.entitlement, workMinutes)}`
}

/** §5.3 の付与日の文字。例: 5月1日 */
export function grantDayText(md: MonthDay): string {
  return `${Number(md.slice(0, 2))}月${Number(md.slice(3, 5))}日`
}

/** R-11 の形のまま */
export function formatAmount(minutes: number, workMinutes: number): string {
  return formatMinutes(minutes, workMinutes)
}

/** §6 の記録の持ち出しの節の 1 行。文は仮（G-6） */
export function transferNoteText(note: TransferNote): string {
  switch (note) {
    case 'imported':
      return '読み込みました'
    case 'restored':
      return '読み込む前に戻しました'
    case 'unreadableFile':
      return errorText('unreadableFile')
    case 'cleared':
      return '記録を消しました'
    case 'noCalendarEntries':
      return T.noCalendarEntries
  }
}

/** §6・F-506: カレンダーの予定の題。名前があれば名前、無ければ休暇の種類の名前。半日と時間単位は量を括弧で添える。例: 有休（2 時間） */
export function calendarEventTitle(entry: Entry, leaveTypeName: string, workMinutes: number): string {
  // 除く文字（要件定義書 E-4）と空白だけの名前は、名前なしとして扱う
  const head = isBlankEventName(entry.title) ? leaveTypeName : entry.title.trim()
  switch (entry.amount.unit) {
    case 'day':
      return head
    case 'half':
      return `${head}（${T.amountHalf}）`
    case 'minutes':
      return `${head}（${amountText(entry.amount, workMinutes)}）`
  }
}

/** §5.6 の件数。例: 日程 12 件、会社の休日 1 件、休暇の種類 1 件を読み込みます */
export function importCountsText(c: ImportCounts): string {
  return `日程 ${c.entries} 件、会社の休日 ${c.companyHolidays} 件、休暇の種類 ${c.leaveTypes} 件を読み込みます`
}

/** 画面定義書 §8.3。restDay・tooFar・invalidGrantDay・endBeforeStart・noDays・tooManyDays 以外は §8.3 にない仮の文。lastAddable は tooFar の文に入れる日付（R-19） */
export function errorText(e: DraftError | RangeError | GrantError | CompanyHolidayError | LeaveTypeError | 'invalidWorkMinutes' | 'hasEntries' | 'tooManyEntries' | 'tooManyCompanyHolidays' | 'tooManyLeaveTypes' | 'unreadableFile', lastAddable?: IsoDate): string {
  switch (e) {
    case 'tooFar':
      return `この日は、まだ入れられません。${lastAddable === undefined ? '' : formatJapaneseDate(lastAddable)}までの日を入れてください`
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
    case 'invalidWorkMinutes':
      return '1分から24時間までで入れてください'
    case 'tooLong':
      return '会社の休日は 1 件 31日までです。長い休みは分けて入れてください'
    case 'reversed':
      return '終わりの日を、始まりの日と同じかそれより後にしてください'
    case 'invalidEntitlement':
      return 'この年に使える日数は、0以上で入れてください'
    case 'tooManyEntries':
      return '日程は 5,000件までです。古い日程を消してから足してください'
    case 'tooManyCompanyHolidays':
      return '会社の休日は 100件までです'
    case 'tooManyLeaveTypes':
      return '休暇の種類は 100件までです'
    case 'unreadableFile':
      return 'このファイルは読み込めませんでした'
    case 'hasEntries':
      return 'この種類の日程が残っています。先に日程を消してください'
    case 'emptyName':
      return '名前を入れてください'
    case 'invalidDays':
      return '日数は、0日から366日まで、0.5日きざみで入れてください'
    case 'endBeforeStart':
      return '終わりの日を、日付と同じかそれより後にしてください'
    case 'noDays':
      return 'この期間には、足せる日（休みの日でない日）がありません'
    case 'tooManyDays':
      return '一度に足せるのは 31日までです。期間を分けて入れてください'
    case 'invalidUsable':
      return '使える期間は、終わりを始まりと同じかそれより後にしてください（年をまたげません）'
  }
}

/** §6 の会社の休日の行（仮の文）。例: 12/30〜1/3　毎年、2026/8/13〜2026/8/16　その年だけ */
export function companyHolidayText(h: CompanyHoliday): string {
  const md = (m: MonthDay) => `${Number(m.slice(0, 2))}/${Number(m.slice(3, 5))}`
  const ymd = (d: IsoDate) => `${d.slice(0, 4)}/${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
  const period = h.kind === 'yearly' ? `${md(h.start)}〜${md(h.end)}　${T.yearly}` : `${ymd(h.start)}〜${ymd(h.end)}　${T.once}`
  // §6: 名前があれば行の先頭に出す
  return h.name === undefined ? period : `${h.name}　${period}`
}

/** §6 の休暇の種類の行（仮の文）。例: 夏季休暇　3日・7/1〜9/30。期間が無ければ 夏季休暇　3日。付与される日とまとめて取る印は添えない */
export function leaveTypeRowText(t: LeaveType): string {
  const md = (m: MonthDay) => `${Number(m.slice(0, 2))}/${Number(m.slice(3, 5))}`
  const period = t.usable === null ? '' : `・${md(t.usable.start)}〜${md(t.usable.end)}`
  return `${t.name}　${t.days}日${period}`
}


/** §3.7 の組の見出し。例: フリーバカンス（5日）をまとめて取る */
export function togetherHeading(leaveTypeName: string, days: number): string {
  return `${leaveTypeName}（${days}日）をまとめて取る`
}

/** §3.7 の残りをまとめる行。例: ほかの取り方（4） */
export function togetherRest(count: number): string {
  return `ほかの取り方（${count}）`
}

// ---- §3.7 候補のカード ----

/** §3.7 の組の見出し。例: 11/23(月) 勤労感謝の日 のまわり、年末年始（12/30〜1/3）のまわり、会社の休日（12/30〜1/3）のまわり、11/21(土)〜 のまわり */
export function coreHeading(head: CoreHead): string {
  switch (head.kind) {
    case 'holiday':
      return `${formatDay(head.date)} ${head.name} のまわり`
    case 'company':
      return `${head.name ?? T.unnamedCompanyHoliday}（${monthDay(head.start)}〜${monthDay(head.end)}）のまわり`
    case 'other':
      return `${formatDay(head.date)}〜 のまわり`
  }
}

/** §3.7 のふつうの候補の休む日。例: 11/20(金)、12/28(月)・12/29(火) */
export function candidateDays(leaveDays: readonly IsoDate[]): string {
  return leaveDays.map(formatDay).join('・')
}

/** §3.7 のまとめて取る休暇の休む日。最初と最後、1 日だけならその日。例: 12/21(月)〜12/25(金) */
export function togetherDays(leaveDays: readonly IsoDate[]): string {
  const first = leaveDays[0]
  const last = leaveDays[leaveDays.length - 1]
  return leaveDays.length === 1 ? formatDay(first) : `${formatDay(first)}〜${formatDay(last)}`
}

/** §3.7 の上の行の左。例: 11/20(金) を休む */
export function takeText(days: string): string {
  return `${days} を休む`
}

/** §3.7 の上の行の右。例: 4連休 */
export function runDaysText(days: number): string {
  return `${days}連休`
}

/** §3.7 の日の並びの読み上げ。例: 11/20〜11/23 の 4連休。休む日は 11/20(金) */
export function stripLabel(run: Run, days: string): string {
  return `${formatPeriod(run)} の ${runDaysText(run.days)}。休む日は ${days}`
}

/** §3.7 の「入れる」の読み上げ。例: 11/20(金) を休む 4連休 を日程に入れる */
export function insertLabel(days: string, runDays: number): string {
  return `${takeText(days)} ${runDaysText(runDays)} を日程に入れる`
}

/** §3.7 のふつうの候補の補足（警告の色の不足は shortNote）。例: ['2日使う', '次の付与年から引く'] */
export function candidateNotes(row: Pick<CandidateRow, 'leaveDays' | 'nextGrantYear' | 'unconfirmed'>): string[] {
  return [
    row.leaveDays.length >= 2 ? leaveDaysUsed(row.leaveDays.length) : null,
    row.nextGrantYear ? T.nextGrantYear : null,
    row.unconfirmed ? T.unconfirmed : null,
  ].filter((x) => x !== null)
}

/** §3.7・F-211 の補足の不足。足りていれば null。例: 有休が 6 時間足りません */
export function shortNote(row: Pick<CandidateRow, 'leaveTypeName' | 'shortMinutes'>, workMinutes: number): string | null {
  return row.shortMinutes === null ? null : shortText(row.leaveTypeName, row.shortMinutes, workMinutes)
}

/** §3.7 のまとめて取る休暇の補足。例: ['次の付与年から引く'] */
export function togetherNotes(row: Pick<TogetherRow, 'nextGrantYear' | 'unconfirmed'>): string[] {
  return [row.nextGrantYear ? T.nextGrantYear : null, row.unconfirmed ? T.unconfirmed : null].filter((x) => x !== null)
}

/** §3.7 の祝日のない月のカードの、月ごとの開く行。例: 12月 金曜か月曜を休むと 3連休（8） */
export function monthGapLine(month: IsoDate, runDays: number, count: number): string {
  return `${Number(month.slice(5, 7))}月 金曜か月曜を休むと ${runDaysText(runDays)}（${count}）`
}

/** §3.7 の日の並びの 1 マス。例: { weekday: '金', day: '20' } */
export function stripCell(d: IsoDate): { weekday: string; day: string } {
  return { weekday: WEEKDAY_NAMES[weekday(d)], day: String(Number(d.slice(8, 10))) }
}
