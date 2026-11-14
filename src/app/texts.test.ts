import { expect, test } from 'vitest'
import { T, candidateText, describeCandidate, errorText, formatAmount, formatDay, formatJapaneseDate, formatPeriod, quarterHeading } from './texts'

test('日付と候補の書き方', () => {
  expect(formatDay('2026-11-02')).toBe('11/2(月)')
  expect(formatPeriod({ start: '2026-12-26', end: '2027-01-03', days: 9 })).toBe('12/26〜1/3')
  expect(formatJapaneseDate('2027-12-31')).toBe('2027年12月31日')
  expect(quarterHeading('2026-10-01')).toBe('2026年 10〜12月')
  const c = { leaveDays: ['2026-12-28', '2026-12-29'], run: { start: '2026-12-26', end: '2027-01-03', days: 9 } }
  expect(candidateText(c)).toBe('12/28(月)・12/29(火) を休むと 9連休')
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
  for (const e of ['invalidDate', 'invalidAmount', 'unknownLeaveType', 'invalidGrantDays', 'invalidCarryOver'] as const) {
    expect(errorText(e)).not.toBe('')
  }
})
test('P-6: 画面定義書の仮の文言', () => {
  expect(T.addToPlan).toBe('日程に入れる')
  expect(T.cannotSave).toBe('このブラウザでは記録を保存できません。閉じると、入れた内容は消えます。')
})
