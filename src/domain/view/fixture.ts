import data from '@/data/holidays.json'
import { DEFAULT_SETTINGS, type Entry } from '@/domain/types'
import type { PlannerInput } from './input'

const e = (date: string, unit: 'day' | 'hours', done: boolean, title = ''): Entry =>
  ({ id: date, date, leaveTypeId: 'paid', amount: unit === 'day' ? { unit: 'day' } : { unit: 'minutes', minutes: 120 }, title, done })

/** オーナーのシートと同じ記録に、会社の休日 12/30〜1/3 を足したもの。今日は 2026-11-15 */
export const SHEET: PlannerInput = {
  holidays: data,
  today: '2026-11-15',
  settings: { ...DEFAULT_SETTINGS, grantDay: '05-01', grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: null } }, companyHolidays: [{ kind: 'yearly', start: '12-30', end: '01-03' }] },
  entries: [
    e('2026-05-15', 'day', true), e('2026-05-21', 'hours', true), e('2026-06-22', 'day', true), e('2026-08-10', 'day', true),
    e('2026-09-04', 'hours', true), e('2026-10-07', 'hours', true, '体調不良'), e('2026-11-02', 'day', true, '連休作成'),
    e('2026-12-28', 'day', false, '年末年始'), e('2026-12-29', 'day', false, '年末年始'),
    e('2027-02-12', 'day', false), e('2027-02-22', 'day', false), e('2027-04-30', 'day', false),
  ],
}
export const UNSET: PlannerInput = { holidays: data, today: '2026-11-15', settings: DEFAULT_SETTINGS, entries: [] }
