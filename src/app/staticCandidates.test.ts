import { expect, test } from 'vitest'
import data from '@/data/holidays.json'
import { describeCandidate, staticCandidateGroups } from './staticCandidates'

test('N-04: 同じ年のうちは、ビルドした日によって HTML に入れる候補が変わらない', () => {
  expect(staticCandidateGroups(data, '2026-11-15')).toEqual(staticCandidateGroups(data, '2026-02-01'))
})
test('N-04: 今年と来年の、祝日が確定している期間の候補が入る', () => {
  const all = staticCandidateGroups(data, '2026-11-15').flatMap((g) => g.candidates)
  expect(all.some((c) => c.leaveDays[0] === '2026-11-02')).toBe(true)
  expect(all.some((c) => c.leaveDays[0] === '2027-02-12')).toBe(true)
  expect(all.every((c) => c.leaveDays[0] <= '2027-12-31')).toBe(true)
})
test('候補の 1 行の書き方', () => {
  expect(describeCandidate({ leaveDays: ['2026-11-02'], run: { start: '2026-10-31', end: '2026-11-03', days: 4 }, long: false, unconfirmed: false, core: '2026-11-03' })).toBe('11/2(月) を休むと 4 連休（10/31〜11/3）')
})
test('候補の 1 行の書き方: 複数日と年またぎ', () => {
  expect(describeCandidate({ leaveDays: ['2026-12-28', '2026-12-29'], run: { start: '2026-12-26', end: '2027-01-03', days: 9 }, long: true, unconfirmed: false, core: '2026-12-26' })).toBe('12/28(月)・12/29(火) を休むと 9 連休（12/26〜1/3）')
})
