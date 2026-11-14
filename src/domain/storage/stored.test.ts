import { describe, expect, test } from 'vitest'
import { DEFAULT_SETTINGS } from '@/domain/types'
import { EMPTY_STORED, isNewerVersion, parseStored, serializeStored } from './stored'

const entry = { id: 'a', date: '2026-11-20', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false }
const ok = { version: 1, settings: DEFAULT_SETTINGS, entries: [entry] }
const parse = (o: unknown) => parseStored(JSON.stringify(o))

describe('保存するデータ（N-02、D-2〜D-4）', () => {
  test('書き出して読むと元に戻る', () => {
    expect(parseStored(serializeStored(EMPTY_STORED))).toEqual({ ok: true, value: EMPTY_STORED })
    expect(parse(ok)).toEqual({ ok: true, value: ok })
  })
  test('知らない項目は読み捨てる', () => {
    const r = parse({ ...ok, extra: 1, entries: [{ ...entry, memo: 'x' }] })
    expect(r).toEqual({ ok: true, value: ok })
  })
  test('Review Focus 1: JSON でない・形が違う・新しい版は失敗', () => {
    expect(parseStored('').ok).toBe(false)
    expect(parseStored('{oops').ok).toBe(false)
    expect(parse(null).ok).toBe(false)
    expect(parse({ ...ok, version: 2 }).ok).toBe(false)
    expect(parse({ ...ok, version: '1' }).ok).toBe(false)
    expect(parse({ version: 1, entries: [] }).ok).toBe(false)
  })
  test('D-3: 版が新しい記録だけを見分ける', () => {
    expect(isNewerVersion(JSON.stringify({ ...ok, version: 2 }))).toBe(true)
    expect(isNewerVersion('{"version":2}')).toBe(true)
    expect(isNewerVersion(JSON.stringify(ok))).toBe(false)
    expect(isNewerVersion('{"version":0}')).toBe(false)
    expect(isNewerVersion('{"version":"2"}')).toBe(false)
    expect(isNewerVersion('{oops')).toBe(false)
    expect(isNewerVersion('null')).toBe(false)
    expect(isNewerVersion('[2]')).toBe(false)
  })
  test('D-4: 日程の決まり', () => {
    const bad = (patch: object) => parse({ ...ok, entries: [{ ...entry, ...patch }] }).ok
    expect(bad({ date: '2027-02-29' })).toBe(false)
    expect(bad({ id: '' })).toBe(false)
    expect(bad({ amount: { unit: 'minutes', minutes: 0 } })).toBe(false)
    expect(bad({ amount: { unit: 'minutes', minutes: 1.5 } })).toBe(false)
    expect(bad({ amount: { unit: 'week' } })).toBe(false)
    expect(bad({ done: 'yes' })).toBe(false)
    expect(parse({ ...ok, entries: [entry, entry] }).ok).toBe(false) // id の重複
  })
  test('D-4: 設定の決まり。R-15 に合わない会社の休日は保存できる', () => {
    const bad = (patch: object) => parse({ ...ok, settings: { ...DEFAULT_SETTINGS, ...patch } }).ok
    expect(bad({ workMinutes: 0 })).toBe(false)
    expect(bad({ workMinutes: 1441 })).toBe(false)
    expect(bad({ grantDay: '02-29' })).toBe(false)
    expect(bad({ leaveTypes: [] })).toBe(false)
    expect(bad({ leaveTypes: [{ id: 'summer', name: '夏季休暇', days: 3, usable: null }] })).toBe(false)
    expect(bad({ grantYears: { '2026-05-01': { grantDays: -1, entitlementMinutes: null } } })).toBe(false)
    expect(bad({ companyHolidays: [{ kind: 'yearly', start: '01-01', end: '12-31' }] })).toBe(true)
    expect(bad({ companyHolidays: [{ kind: 'monthly' }] })).toBe(false)
  })
  test('D-4: 付与年の設定は grantDays と entitlementMinutes（null か 0 以上の整数）。古い形（carryOverMinutes）は読めない', () => {
    const grant = (g: object) => parse({ ...ok, settings: { ...DEFAULT_SETTINGS, grantDay: '05-01', grantYears: { '2026-05-01': g } } }).ok
    expect(grant({ grantDays: 14, entitlementMinutes: null })).toBe(true)
    expect(grant({ grantDays: 14, entitlementMinutes: 0 })).toBe(true)
    expect(grant({ grantDays: 14, entitlementMinutes: 17 * 480 })).toBe(true)
    expect(grant({ grantDays: 14, entitlementMinutes: -1 })).toBe(false)
    expect(grant({ grantDays: 14, entitlementMinutes: 1.5 })).toBe(false)
    expect(grant({ grantDays: 14 })).toBe(false)
    expect(grant({ grantDays: 14, carryOverMinutes: 0 })).toBe(false)
  })
})
