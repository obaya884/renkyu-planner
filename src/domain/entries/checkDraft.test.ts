import { expect, test } from 'vitest'
import { SHEET } from '@/domain/view/fixture'
import { checkEntryDraft, checkGrantDraft, lastAddableDate } from './checkDraft'

const draft = (date: string, amount: object = { unit: 'day' }) => ({ date, leaveTypeId: 'paid', amount, title: '', done: false }) as never

test('R-17: 休みの日には入れられない（土日・祝日・会社の休日）', () => {
  expect(checkEntryDraft(SHEET, draft('2026-11-14'), null).errors).toEqual(['restDay'])  // 土曜
  expect(checkEntryDraft(SHEET, draft('2026-11-23'), null).errors).toEqual(['restDay'])  // 祝日
  expect(checkEntryDraft(SHEET, draft('2026-12-30'), null).errors).toEqual(['restDay'])  // 会社の休日
  expect(checkEntryDraft(SHEET, draft('2026-11-16'), null).errors).toEqual([])
  expect(checkEntryDraft(SHEET, draft('2026-11-14', { unit: 'half' }), null).errors).toEqual(['restDay']) // 量を問わない
})
test('R-17: 休みの日と重なった日程は、同じ日付で保存し直せない。Review Focus 3', () => {
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
  expect(checkGrantDraft({ grantDay: '05-01', grantDays: 14, entitlementMinutes: null })).toEqual([])
  expect(checkGrantDraft({ grantDay: '02-29', grantDays: 14, entitlementMinutes: null })).toEqual(['invalidGrantDay'])
  expect(checkGrantDraft({ grantDay: '05-01', grantDays: -1, entitlementMinutes: null })).toEqual(['invalidGrantDays'])
  expect(checkGrantDraft({ grantDay: '05-01', grantDays: 10.3, entitlementMinutes: null })).toEqual(['invalidGrantDays'])
  expect(checkGrantDraft({ grantDay: '05-01', grantDays: 14, entitlementMinutes: 17 * 480 })).toEqual([])
  expect(checkGrantDraft({ grantDay: '05-01', grantDays: 14, entitlementMinutes: -1 })).toEqual(['invalidEntitlement'])
  expect(checkGrantDraft({ grantDay: '05-01', grantDays: 14, entitlementMinutes: 1.5 })).toEqual(['invalidEntitlement'])
})
test('R-19: 足せる日付は 4 つ目の四半期の末日まで。過ぎた日付は足せる。直すときは当てない', () => {
  expect(lastAddableDate('2026-11-15')).toBe('2027-09-30')
  expect(checkEntryDraft(SHEET, draft('2027-09-30'), null).errors).toEqual([])
  expect(checkEntryDraft(SHEET, draft('2027-10-01'), null).errors).toEqual(['tooFar'])
  expect(checkEntryDraft(SHEET, draft('2026-10-01'), null).errors).toEqual([]) // 過ぎた平日
  expect(checkEntryDraft(SHEET, draft('2028-03-01'), '2026-12-28').errors).toEqual([])
  expect(checkEntryDraft(SHEET, draft('2027-10-02'), null).errors).toEqual(['tooFar', 'restDay']) // 並びは invalidDate、tooFar、restDay の順
})
