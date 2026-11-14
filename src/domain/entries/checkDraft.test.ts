import { expect, test } from 'vitest'
import { SHEET } from '@/domain/view/fixture'
import { checkEntryDraft, checkGrantDraft } from './checkDraft'

const draft = (date: string, amount: object = { unit: 'day' }) => ({ date, leaveTypeId: 'paid', amount, title: '', done: false }) as never

test('R-17: 休みの日には入れられない（土日・祝日・会社の休日）', () => {
  expect(checkEntryDraft(SHEET, draft('2026-11-14'), null).errors).toEqual(['restDay'])  // 土曜
  expect(checkEntryDraft(SHEET, draft('2026-11-23'), null).errors).toEqual(['restDay'])  // 祝日
  expect(checkEntryDraft(SHEET, draft('2026-12-30'), null).errors).toEqual(['restDay'])  // 会社の休日
  expect(checkEntryDraft(SHEET, draft('2026-11-16'), null).errors).toEqual([])
  expect(checkEntryDraft(SHEET, draft('2026-11-14', { unit: 'half' }), null).errors).toEqual(['restDay']) // 量を問わない
})
test('R-17: 自分の日付は休みの日に数えない。Review Focus 3: 重なった日程は同じ日付で保存し直せない', () => {
  expect(checkEntryDraft(SHEET, draft('2026-12-28'), '2026-12-28').errors).toEqual([])
  const overlapped = { ...SHEET, entries: [...SHEET.entries, { id: 'y', date: '2026-11-23', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false } as const] }
  expect(checkEntryDraft(overlapped, draft('2026-11-23'), 'y').errors).toEqual(['restDay'])
})
test('日付と量と休暇の種類の検証', () => {
  expect(checkEntryDraft(SHEET, draft('2027-02-29'), null).errors).toEqual(['invalidDate'])
  expect(checkEntryDraft(SHEET, draft('2026-11-16', { unit: 'minutes', minutes: 0 }), null).errors).toEqual(['invalidAmount'])
  expect(checkEntryDraft(SHEET, draft('2026-11-16', { unit: 'minutes', minutes: 481 }), null).errors).toEqual(['invalidAmount'])
  expect(checkEntryDraft(SHEET, { ...(draft('2026-11-16') as object), leaveTypeId: 'summer' } as never, null).errors).toEqual(['unknownLeaveType'])
})
test('F-306: 同じ日の合計が 1 日を超えると知らせる（保存はできる）', () => {
  expect(checkEntryDraft(SHEET, draft('2026-10-07'), null)).toEqual({ errors: [], overOneDay: true }) // 既に 2 時間ある日に 1 日
  expect(checkEntryDraft(SHEET, draft('2026-10-07', { unit: 'half' }), null).overOneDay).toBe(false)
  expect(checkEntryDraft(SHEET, draft('2026-10-07'), '2026-10-07').overOneDay).toBe(false) // 自分自身は足さない
})
test('R-12・F-101: 付与日と日数の検証', () => {
  expect(checkGrantDraft({ grantDay: '05-01', grantDays: 14, carryOverMinutes: 0 })).toEqual([])
  expect(checkGrantDraft({ grantDay: '02-29', grantDays: 14, carryOverMinutes: 0 })).toEqual(['invalidGrantDay'])
  expect(checkGrantDraft({ grantDay: '05-01', grantDays: -1, carryOverMinutes: 0 })).toEqual(['invalidGrantDays'])
  expect(checkGrantDraft({ grantDay: '05-01', grantDays: 10.3, carryOverMinutes: 0 })).toEqual(['invalidGrantDays'])
  expect(checkGrantDraft({ grantDay: '05-01', grantDays: 14, carryOverMinutes: -1 })).toEqual(['invalidCarryOver'])
})
