import { expect, test } from 'vitest'
import data from '@/data/holidays.json'
import { staticCandidateGroups } from './staticCandidates'

test('N-04: 同じ年のうちは、ビルドした日によって HTML に入れる候補が変わらない', () => {
  expect(staticCandidateGroups(data, '2026-11-15')).toEqual(staticCandidateGroups(data, '2026-02-01'))
})
test('N-04: 今年と来年の、祝日が確定している期間の候補が入る', () => {
  const all = staticCandidateGroups(data, '2026-11-15').flatMap((g) => g.candidates)
  expect(all.some((c) => c.leaveDays[0] === '2026-11-02')).toBe(true)
  expect(all.some((c) => c.leaveDays[0] === '2027-02-12')).toBe(true)
  expect(all.every((c) => c.leaveDays[0] <= '2027-12-31')).toBe(true)
})
test('N-04: 確定期限が翌年末より前なら、候補の最初の休む日は確定期限までに収まる', () => {
  const early = { ...data, confirmedUntil: '2026-12-31' }
  const all = staticCandidateGroups(early, '2026-11-15').flatMap((g) => g.candidates)
  expect(all.length).toBeGreaterThan(0)
  expect(all.every((c) => c.leaveDays[0] <= '2026-12-31')).toBe(true)
})
