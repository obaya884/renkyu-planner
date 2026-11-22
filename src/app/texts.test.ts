import { expect, test } from 'vitest'
import { T, longBreakBadgeText, longBreakHeading, candidateDays, candidateNotes, coreHeading, describeCandidate, errorText, formatAmount, formatDay, formatJapaneseDate, formatPeriod, holidayNote, insertLabel, joinNotes, longBreakChip, monthGapLine, quarterHeading, runDaysText, shortNote, stripCell, stripLabel, takeText, togetherDays, togetherHeading, togetherNotes, togetherRest, unassignedText, usablePeriod, unassignedLabel } from './texts'

test('日付と候補の書き方', () => {
  expect(formatDay('2026-11-02')).toBe('11/2(月)')
  expect(formatPeriod({ start: '2026-12-26', end: '2027-01-03', days: 9 })).toBe('12/26〜1/3')
  expect(formatJapaneseDate('2027-12-31')).toBe('2027年12月31日')
  expect(quarterHeading('2026-10-01')).toBe('2026年 10〜12月')
  expect(describeCandidate({ leaveDays: ['2026-11-02'], run: { start: '2026-10-31', end: '2026-11-03', days: 4 } })).toBe('11/2(月) を休むと 4 連休（10/31〜11/3）')
})
test('候補の 1 行の書き方: 複数日と年またぎ', () => {
  expect(describeCandidate({ leaveDays: ['2026-12-28', '2026-12-29'], run: { start: '2026-12-26', end: '2027-01-03', days: 9 } })).toBe('12/28(月)・12/29(火) を休むと 9 連休（12/26〜1/3）')
})
test('R-11: 量は formatMinutes の形のまま', () => {
  expect(formatAmount(4 * 480 + 120, 480)).toBe('4 日と 2 時間')
})
test('§8.3: 受け付けないときの文言', () => {
  expect(errorText('restDay')).toBe('この日は休みの日です。休みの日には入れられません')
  expect(errorText('invalidGrantDay')).toBe('2月29日は付与日にできません')
  expect(errorText('tooFar', '2027-09-30')).toBe('この日は、まだ入れられません。2027年9月30日までの日を入れてください')
  for (const e of ['invalidDate', 'invalidAmount', 'unknownLeaveType', 'invalidGrantDays', 'invalidEntitlement'] as const) {
    expect(errorText(e)).not.toBe('')
  }
})
test('P-6: 画面定義書の仮の文言', () => {
  expect(T.addToPlan).toBe('日程に入れる')
  expect(T.cannotSave).toBe('このブラウザでは記録を保存できません。閉じると、入れた内容は消えます。')
})
test('§3.3・R-14: 見出しの定義の数字は引数から作る', () => {
  expect(longBreakHeading(5)).toBe('長めの休暇（5連休以上）')
})
test('§3.5: 節の札の言葉。あり・まだは上の 4 つの札と同じ', () => {
  expect(longBreakBadgeText('has')).toBe(T.has)
  expect(longBreakBadgeText('notYet')).toBe(T.notYet)
  expect(longBreakBadgeText('none')).toBe(T.longBreakNone)
  expect(T.longBreakNone).toBe('なし')
})
test('§3.2・§3.3・§3.10: 使える期間、長めの休暇の札、祝日の 1 行', () => {
  expect(usablePeriod('07-01', '09-30')).toBe('7〜9月')
  expect(usablePeriod('07-15', '09-30')).toBe('7/15〜9/30')
  expect(longBreakChip('2026-10-01', true)).toBe('10〜12月 あり')
  expect(longBreakChip('2027-01-01', false)).toBe('1〜3月 まだ')
  expect(holidayNote('2027-12-31')).toBe('祝日は内閣府の公表データです。2027年12月31日まで確定。')
})
test('§3.2・§5.1: 未割り当ての片側は、1 分以上足りないときだけ「不足」', () => {
  expect(unassignedText(-480, 480)).toBe('不足 1 日')
  expect(unassignedText(-0.5, 465)).toBe('0 日')
  expect(unassignedText(0, 480)).toBe('0 日')
})
test('§3.7・§3.8: 2 行目の語句は「・」でつなぐ', () => {
  expect(joinNotes(['11/20〜11/23', '2日使う'])).toBe('11/20〜11/23・2日使う')
  expect(joinNotes(['予定'])).toBe('予定')
  expect(joinNotes([])).toBe('')
})

test('§3.7: まとめて取る休暇の文言', () => {
  expect(togetherHeading('フリーバカンス', 5)).toBe('フリーバカンス（5日）をまとめて取る')
  expect(togetherRest(4)).toBe('ほかの取り方（4）')
})
test('§3.7: 組の見出し。祝日、名前のある会社の休日、名前の無い会社の休日、どちらでもない核', () => {
  expect(coreHeading({ kind: 'holiday', date: '2026-11-23', name: '勤労感謝の日' })).toBe('11/23(月) 勤労感謝の日 のまわり')
  expect(coreHeading({ kind: 'company', start: '2026-12-30', end: '2027-01-03', name: '年末年始' })).toBe('年末年始（12/30〜1/3）のまわり')
  expect(coreHeading({ kind: 'company', start: '2026-12-30', end: '2027-01-03', name: null })).toBe('会社の休日（12/30〜1/3）のまわり')
  expect(coreHeading({ kind: 'other', date: '2026-11-21' })).toBe('11/21(土)〜 のまわり')
})
test('§3.7: 候補 1 件の上の行と、読み上げの文', () => {
  const run = { start: '2026-11-20', end: '2026-11-23', days: 4 }
  expect(takeText(candidateDays(['2026-11-20']))).toBe('11/20(金) を休む')
  expect(takeText(candidateDays(['2026-12-28', '2026-12-29']))).toBe('12/28(月)・12/29(火) を休む')
  expect(runDaysText(4)).toBe('4連休')
  expect(stripLabel(run, candidateDays(['2026-11-20']))).toBe('11/20〜11/23 の 4連休。休む日は 11/20(金)')
  expect(insertLabel(candidateDays(['2026-11-20']), 4)).toBe('11/20(金) を休む 4連休 を日程に入れる')
  expect(stripCell('2026-11-20')).toEqual({ weekday: '金', day: '20' })
  expect(stripCell('2027-01-03')).toEqual({ weekday: '日', day: '3' })
})
test('§3.7: まとめて取る休暇の休む日は、最初と最後。1 日だけならその日', () => {
  expect(togetherDays(['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25'])).toBe('12/21(月)〜12/25(金)')
  expect(togetherDays(['2026-11-20'])).toBe('11/20(金)')
})
test('§3.7・F-202・F-209・F-210・F-211: 補足の語句', () => {
  const row = { leaveDays: ['2026-12-28', '2026-12-29'], nextGrantYear: true, unconfirmed: true }
  expect(candidateNotes(row)).toEqual(['2日使う', '次の付与年から引く', '祝日が未確定'])
  expect(candidateNotes({ leaveDays: ['2026-11-20'], nextGrantYear: false, unconfirmed: false })).toEqual([])
  expect(togetherNotes({ nextGrantYear: true, unconfirmed: false })).toEqual(['次の付与年から引く'])
  expect(togetherNotes({ nextGrantYear: false, unconfirmed: true })).toEqual(['祝日が未確定'])
  expect(shortNote({ leaveTypeName: '有休', shortMinutes: 360 }, 480)).toBe('有休が 6 時間足りません')
  expect(shortNote({ leaveTypeName: '有休', shortMinutes: null }, 480)).toBeNull()
})
test('§3.7・F-205: 祝日のない月のカードの開く行', () => {
  expect(monthGapLine('2026-12-01', 3, 8)).toBe('12月 金曜か月曜を休むと 3連休（8）')
})

test('§5.1: 未割り当ての行の見出し。前の付与年は、1 行だけでも「前の付与年」と出す', () => {
  expect(unassignedLabel('current', 1)).toBe('未割り当て')
  expect(unassignedLabel('next', 1)).toBe('未割り当て')
  expect(unassignedLabel('previous', 1)).toBe('前の付与年')
  expect(unassignedLabel('previous', 2)).toBe('前の付与年')
  expect(unassignedLabel('current', 2)).toBe('今の付与年')
  expect(unassignedLabel('next', 2)).toBe('次の付与年')
})
