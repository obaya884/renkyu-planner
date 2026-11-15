import { expect, test } from 'vitest'
import { endDateAfterDateChange, endDateOnToggle } from './rangeInput'
import { SHEET } from './fixture'
import { previewRange } from './rangePreview'
import { planEntrySave } from './entrySave'

test('F-307・§5.2: 「期間で足す」を入れたときの終わりの日は、日付と同じ日。外して入れ直しても同じ日に戻る', () => {
  expect(endDateOnToggle('2026-11-20')).toBe('2026-11-20')
  expect(endDateOnToggle('')).toBe('')
})
test('F-307・§5.2: 日付を後ろに動かして終わりの日を追い越したら、終わりの日を日付と同じ日に直す', () => {
  expect(endDateAfterDateChange('2026-11-25', '2026-11-20')).toBe('2026-11-25')
})
test('F-307・§5.2: 日付を前に動かしたときと、終わりの日より前のままのときは、終わりの日に触らない', () => {
  expect(endDateAfterDateChange('2026-11-18', '2026-11-20')).toBe('2026-11-20')
  expect(endDateAfterDateChange('2026-11-20', '2026-11-20')).toBe('2026-11-20') // 同じ日は追い越していない
})
test('F-307・§5.2: 日付が空・正しくないとき、終わりの日が空・正しくないときは、終わりの日に触らない', () => {
  expect(endDateAfterDateChange('', '2026-11-20')).toBe('2026-11-20')
  expect(endDateAfterDateChange('2026-13-40', '2026-11-20')).toBe('2026-11-20')
  expect(endDateAfterDateChange('2026-11-25', '')).toBe('')
  expect(endDateAfterDateChange('2026-11-25', '2026-02-30')).toBe('2026-02-30')
})

const draft = (date: string) => ({ date, leaveTypeId: 'paid', amount: { unit: 'day' as const }, title: '' })
const planFor = (start: string, end: string) => planEntrySave(SHEET, draft(start), null, previewRange(SHEET, start, end, 'paid'))

test('F-307・§5.2: 期間で足すとき、終わりの日が空・正しくない・日付より前なら保存できない', () => {
  expect(previewRange(SHEET, '2026-11-20', '', 'paid').errors).toEqual(['invalidDate'])
  expect(previewRange(SHEET, '2026-11-20', '2026-02-30', 'paid').errors).toEqual(['invalidDate'])
  expect(previewRange(SHEET, '2026-11-20', '2026-11-19', 'paid').errors).toEqual(['endBeforeStart'])
  expect(planFor('2026-11-20', '').canSave).toBe(false)
  expect(planFor('2026-11-20', '2026-11-19').canSave).toBe(false)
})
test('R-19・F-307: 終わりの日が 4 つ目の四半期の末日より先なら保存できない。末日ちょうどは足せる', () => {
  expect(previewRange(SHEET, '2027-09-30', '2027-10-01', 'paid').errors).toEqual(['tooFar'])
  expect(planFor('2027-09-30', '2027-10-01').canSave).toBe(false)
  expect(planFor('2027-09-30', '2027-09-30').canSave).toBe(true) // 木曜
})
test('F-307・§5.2: 終わりの日が日付と同じなら、平日は断らずに 1 日だけ足す', () => {
  const plan = planFor('2026-11-20', '2026-11-20')
  expect(plan.drafts.map((d) => d.date)).toEqual(['2026-11-20'])
  expect(plan).toMatchObject({ errors: [], canSave: true })
})
test('F-307・§5.2: 終わりの日が日付と同じで休みの日なら、足す日が 1 日も無いのと同じで保存できない', () => {
  expect(previewRange(SHEET, '2026-11-21', '2026-11-21', 'paid').errors).toEqual(['noDays']) // 土曜
  expect(previewRange(SHEET, '2026-11-23', '2026-11-23', 'paid').errors).toEqual(['noDays']) // 祝日
  expect(previewRange(SHEET, '2026-12-31', '2026-12-31', 'paid').errors).toEqual(['noDays']) // 会社の休日
  expect(planFor('2026-11-21', '2026-11-21').canSave).toBe(false)
})
