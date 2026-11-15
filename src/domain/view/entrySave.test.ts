import { expect, test } from 'vitest'
import type { EntryDraft } from '@/domain/entries/checkDraft'
import { SHEET } from './fixture'
import { planAddSave, planEntrySave } from './entrySave'
import { previewRange } from './rangePreview'

const draft = (patch: Partial<EntryDraft> = {}): EntryDraft => ({ date: '2026-11-20', leaveTypeId: 'paid', amount: { unit: 'half' }, title: '通院', done: false, ...patch })

test('F-301・R-17: 終わりの日が空なら、入力の 1 件をそのまま保存する。理由があれば保存できない', () => {
  expect(planEntrySave(SHEET, draft(), null, null)).toEqual({ drafts: [draft()], errors: [], canSave: true })
  // 2026-11-21 は土曜（R-17）
  expect(planEntrySave(SHEET, draft({ date: '2026-11-21' }), null, null)).toEqual({ drafts: [draft({ date: '2026-11-21' })], errors: ['restDay'], canSave: false })
})
test('F-307・§5.2: 期間で足すときは、足す日ごとに 1 日の日程。量は 1 日、引く休暇・予定の名前・状態は入力のまま', () => {
  // 2026-12-28〜2027-01-04 の足す日は、12/28・12/29・1/4（12/30〜1/3 は会社の休日、1/2・1/3 は土日）の 3 日
  const range = previewRange(SHEET, '2026-12-28', '2027-01-04', 'paid')
  const plan = planEntrySave(SHEET, draft({ date: '2026-12-28', title: '年末', done: true }), null, range)
  expect(plan.drafts).toEqual(
    ['2026-12-28', '2026-12-29', '2027-01-04'].map((date) => ({ date, leaveTypeId: 'paid', amount: { unit: 'day' }, title: '年末', done: true })),
  )
  expect(plan).toMatchObject({ errors: [], canSave: true })
  expect(planEntrySave(SHEET, draft({ date: '2026-12-28' }), null, range).drafts.every((d) => !d.done && d.title === '通院')).toBe(true)
})
test('F-307・§5.2: 期間の理由（日付が空・終わりの日が前・先すぎる・足す日が無い）があれば、保存できない', () => {
  for (const [start, end] of [['', '2026-12-01'], ['2026-11-24', '2026-11-19'], ['2027-09-27', '2027-10-01'], ['2026-12-30', '2027-01-03']]) {
    const plan = planEntrySave(SHEET, draft({ date: start }), null, previewRange(SHEET, start, end, 'paid'))
    expect(plan).toEqual({ drafts: [], errors: [], canSave: false })
  }
})
test('F-104・F-307: 期間で足すとき、引く休暇が設定に無ければ理由を返し、保存できない', () => {
  const range = previewRange(SHEET, '2026-11-24', '2026-11-25', 'gone')
  const plan = planEntrySave(SHEET, draft({ date: '2026-11-24', leaveTypeId: 'gone' }), null, range)
  expect(plan.drafts.map((d) => d.date)).toEqual(['2026-11-24', '2026-11-25'])
  expect(plan).toMatchObject({ errors: ['unknownLeaveType'], canSave: false })
})
test('D-10: 足すと日程が 5,000 件を超えるときは保存できない。直すときは数えない', () => {
  const many = Array.from({ length: 5000 }, (_, i) => ({ id: `e${i}`, date: '2026-05-15', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: true }) as const)
  const input = { ...SHEET, entries: many }
  const add = planEntrySave(input, draft({ date: '2026-11-16' }), null, null)
  expect(add.canSave).toBe(false)
  expect(add.errors).toContain('tooManyEntries')
  expect(planEntrySave(input, draft({ date: '2026-11-16' }), 'e0', null).errors).not.toContain('tooManyEntries')
  expect(planEntrySave({ ...SHEET, entries: many.slice(1) }, draft({ date: '2026-11-16' }), null, null).errors).not.toContain('tooManyEntries')
})
test('D-10: 期間で足すときも、合計が 5,000 件を超えるなら保存できない', () => {
  const many = Array.from({ length: 4999 }, (_, i) => ({ id: `e${i}`, date: '2026-05-15', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: true }) as const)
  const input = { ...SHEET, entries: many }
  // 2026-11-16（月）と 2026-11-17（火）の 2 日。4,999 件に 2 件足すと 5,001 件
  const range = previewRange(input, '2026-11-16', '2026-11-17', 'paid')
  const plan = planEntrySave(input, draft({ date: '2026-11-16' }), null, range)
  expect(plan.drafts).toHaveLength(2)
  expect(plan.errors).toContain('tooManyEntries')
  expect(plan.canSave).toBe(false)
})

test('D-10: 予定の名前は 100 文字で切る（1 件・期間）', () => {
  const long = 'あ'.repeat(101)
  expect(planEntrySave(SHEET, draft({ title: long }), null, null).drafts[0].title).toBe('あ'.repeat(100))
  const range = previewRange(SHEET, '2026-11-16', '2026-11-17', 'paid')
  expect(planEntrySave(SHEET, draft({ date: '2026-11-16', title: long }), null, range).drafts.every((d) => d.title === 'あ'.repeat(100))).toBe(true)
})
test('D-10: 期間で足してちょうど 5,000 件になるなら足せる', () => {
  const many = Array.from({ length: 4998 }, (_, i) => ({ id: `e${i}`, date: '2026-05-15', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: true }) as const)
  const input = { ...SHEET, entries: many }
  const range = previewRange(input, '2026-11-16', '2026-11-17', 'paid')
  expect(planEntrySave(input, draft({ date: '2026-11-16' }), null, range)).toMatchObject({ errors: [], canSave: true })
})
test('D-10・§5.1: planAddSave は、名前を 100 文字で切り、足すと 5,000 件を超えるなら tooManyEntries', () => {
  const ok = planAddSave(SHEET, ['2026-11-16'], 'paid', 'あ'.repeat(101))
  expect(ok.drafts).toEqual([{ date: '2026-11-16', leaveTypeId: 'paid', amount: { unit: 'day' }, title: 'あ'.repeat(100), done: false }])
  expect(ok.errors).toEqual([])
  const many = Array.from({ length: 4999 }, (_, i) => ({ id: `e${i}`, date: '2026-05-15', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: true }) as const)
  expect(planAddSave({ ...SHEET, entries: many }, ['2026-11-16', '2026-11-17'], 'paid', '').errors).toContain('tooManyEntries')
})
