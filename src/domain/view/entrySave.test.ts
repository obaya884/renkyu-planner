import { expect, test } from 'vitest'
import type { EntryDraft } from '@/domain/entries/checkDraft'
import { SHEET } from './fixture'
import { planEntrySave } from './entrySave'
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
