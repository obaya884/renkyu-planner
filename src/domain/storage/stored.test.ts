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
  test('D-4: 設定の決まり。R-15 に合わない会社の休日は読むときに落とす', () => {
    const bad = (patch: object) => parse({ ...ok, settings: { ...DEFAULT_SETTINGS, ...patch } }).ok
    expect(bad({ workMinutes: 0 })).toBe(false)
    expect(bad({ workMinutes: 1441 })).toBe(false)
    expect(bad({ grantDay: '02-29' })).toBe(false)
    expect(bad({ leaveTypes: [] })).toBe(false)
    expect(bad({ leaveTypes: [{ id: 'summer', name: '夏季休暇', days: 3, usable: null, grantDay: null, together: false }] })).toBe(false)
    expect(bad({ grantYears: { '2026-05-01': { grantDays: -1, entitlementMinutes: null } } })).toBe(false)
    expect(bad({ companyHolidays: [{ kind: 'monthly' }] })).toBe(false)
    // 366 日の休日は R-15 に合わない。記録の全体は読めて、その休日だけが落ちる
    expect(parse({ ...ok, settings: { ...DEFAULT_SETTINGS, companyHolidays: [{ kind: 'yearly', start: '01-01', end: '12-31' }] } })).toEqual({ ok: true, value: ok })
  })
  test('D-4: 会社の休日は、R-15 に合うものだけが残る', () => {
    const good = { kind: 'yearly', start: '12-30', end: '01-03' }
    const once = { kind: 'once', start: '2026-08-13', end: '2026-08-16' }
    const companyHolidays = [good, { kind: 'once', start: '2026-08-13', end: '2026-08-12' }, { kind: 'yearly', start: '08-01', end: '09-01' }, once]
    const r = parse({ ...ok, settings: { ...DEFAULT_SETTINGS, companyHolidays } })
    expect(r.ok && r.value.settings.companyHolidays).toEqual([good, once])
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
  test('D-4: 休暇の種類の grantDay と together。項目が無い記録は null・false として読む', () => {
    const old = { id: 'summer', name: '夏季休暇', days: 3, usable: null }
    const r = parse({ ...ok, settings: { ...DEFAULT_SETTINGS, leaveTypes: [...DEFAULT_SETTINGS.leaveTypes, old] } })
    expect(r.ok && r.value.settings.leaveTypes[1]).toEqual({ ...old, grantDay: null, together: false })
    const bad = (patch: object) => parse({ ...ok, settings: { ...DEFAULT_SETTINGS, leaveTypes: [...DEFAULT_SETTINGS.leaveTypes, { ...old, ...patch }] } }).ok
    expect(bad({ grantDay: '01-01', together: true })).toBe(true)
    expect(bad({ grantDay: '02-29' })).toBe(false)
    expect(bad({ together: 'yes' })).toBe(false)
  })
  test('F-108・D-4: weekStart は monday か sunday。項目が無ければ monday として読む', () => {
    const { weekStart: _omit, ...old } = DEFAULT_SETTINGS
    const read = parse({ ...ok, settings: old })
    expect(read.ok && read.value.settings.weekStart).toBe('monday')
    const sunday = parse({ ...ok, settings: { ...DEFAULT_SETTINGS, weekStart: 'sunday' } })
    expect(sunday.ok && sunday.value.settings.weekStart).toBe('sunday')
    expect(parse({ ...ok, settings: { ...DEFAULT_SETTINGS, weekStart: 'tuesday' } }).ok).toBe(false)
    expect(parse({ ...ok, settings: { ...DEFAULT_SETTINGS, weekStart: null } }).ok).toBe(false)
  })
  test('F-103・D-4: 会社の休日の name は任意。前後の空白を除き、空と項目なしは名前なし', () => {
    const withH = (h: unknown) => parse({ ...ok, settings: { ...DEFAULT_SETTINGS, companyHolidays: [h] } })
    const holidaysOf = (r: ReturnType<typeof parse>) => (r.ok ? r.value.settings.companyHolidays : null)
    expect(holidaysOf(withH({ kind: 'yearly', start: '12-30', end: '01-03', name: ' 年末年始 ' }))).toEqual([{ kind: 'yearly', start: '12-30', end: '01-03', name: '年末年始' }])
    expect(holidaysOf(withH({ kind: 'yearly', start: '12-30', end: '01-03' }))).toEqual([{ kind: 'yearly', start: '12-30', end: '01-03' }])
    expect(holidaysOf(withH({ kind: 'once', start: '2027-08-13', end: '2027-08-13', name: '  ' }))).toEqual([{ kind: 'once', start: '2027-08-13', end: '2027-08-13' }])
    expect(withH({ kind: 'yearly', start: '12-30', end: '01-03', name: 5 }).ok).toBe(false)
  })
})
