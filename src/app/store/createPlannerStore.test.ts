import { expect, test } from 'vitest'
import { EMPTY_STORED, STORAGE_KEY, UNREADABLE_KEY, parseStored, serializeStored } from '@/domain/storage/stored'
import { grantEntitlementToSave } from '@/domain/entries/grantInput'
import { balanceOf } from '@/domain/leave/balance'
import { PAID_LEAVE_TYPE_ID } from '@/domain/types'
import { SHEET } from '@/domain/view/fixture'
import { createPlannerStore } from './createPlannerStore'

const memory = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init))
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    dump: () => Object.fromEntries(m),
  }
}
const ids = () => {
  let n = 0
  return () => `id-${++n}`
}
const draft = (date: string) => ({ date, leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false }) as const

test('D-6: 何も無ければ空の記録で始まる', () => {
  const s = createPlannerStore(memory(), ids())
  expect(s.getState().ready).toBe(false)
  s.load()
  expect(s.getState()).toEqual({ ready: true, data: EMPTY_STORED, canSave: true, unreadable: false })
})
test('D-7: 日程を足す・直す・消すたびに全体を書く', () => {
  const m = memory()
  const s = createPlannerStore(m, ids())
  s.load()
  s.addEntries([draft('2026-12-28'), draft('2026-12-29')])
  expect(s.getState().data.entries.map((e) => [e.id, e.date])).toEqual([
    ['id-1', '2026-12-28'],
    ['id-2', '2026-12-29'],
  ])
  s.updateEntry('id-1', { ...draft('2026-12-28'), done: true })
  s.removeEntry('id-2')
  expect(JSON.parse(m.dump()[STORAGE_KEY]).entries).toEqual([{ id: 'id-1', ...draft('2026-12-28'), done: true }])
})
test('D-3: 保存された記録を読む', () => {
  const m = memory()
  const a = createPlannerStore(m, ids())
  a.load()
  a.addEntries([draft('2026-12-28')])
  const b = createPlannerStore(m, ids())
  b.load()
  expect(b.getState()).toMatchObject({ ready: true, unreadable: false, canSave: true })
  expect(b.getState().data.entries.map((e) => e.date)).toEqual(['2026-12-28'])
})
test('Review Focus 1・D-3・D-5: 新しい版の記録は写しを取り、空の記録で始め、保存を止める', () => {
  const m = memory({ [STORAGE_KEY]: '{"version":2}' })
  const s = createPlannerStore(m, ids())
  s.load()
  expect(s.getState()).toMatchObject({ ready: true, data: EMPTY_STORED, unreadable: true, canSave: false })
  expect(m.dump()[UNREADABLE_KEY]).toBe('{"version":2}')
  expect(m.dump()[STORAGE_KEY]).toBe('{"version":2}')
  s.addEntries([draft('2026-12-28')])
  expect(m.dump()[STORAGE_KEY]).toBe('{"version":2}') // 何か変えても、新しい版の記録に触らない
  expect(s.getState().data.entries).toHaveLength(1)
})
test('D-5: 壊れた記録（JSON でない）は、写しを取ったら保存を続けられる', () => {
  const m = memory({ [STORAGE_KEY]: '{oops' })
  const s = createPlannerStore(m, ids())
  s.load()
  expect(s.getState()).toMatchObject({ ready: true, data: EMPTY_STORED, unreadable: true, canSave: true })
  expect(m.dump()[UNREADABLE_KEY]).toBe('{oops')
  expect(m.dump()[STORAGE_KEY]).toBe('{oops') // 何か変えるまで元の内容に触らない
  s.addEntries([draft('2026-12-28')])
  expect(JSON.parse(m.dump()[STORAGE_KEY]).entries).toHaveLength(1)
})
test('D-5: 写しを書けなくても、空の記録で始める', () => {
  const m = memory({ [STORAGE_KEY]: 'x' })
  const s = createPlannerStore({ getItem: m.getItem, setItem: () => { throw new Error('full') } }, ids())
  s.load()
  expect(s.getState()).toMatchObject({ ready: true, data: EMPTY_STORED, unreadable: true, canSave: false })
})
test('D-5: 写しを書けなかったときは、元の記録を上書きしない', () => {
  const m = memory({ [STORAGE_KEY]: '{"version":2}' })
  const s = createPlannerStore(
    {
      getItem: m.getItem,
      setItem: (k, v) => {
        if (k === UNREADABLE_KEY) throw new Error('full')
        m.setItem(k, v)
      },
    },
    ids(),
  )
  s.load()
  expect(s.getState()).toMatchObject({ ready: true, unreadable: true, canSave: false })
  s.addEntries([draft('2026-12-28')])
  expect(m.dump()[STORAGE_KEY]).toBe('{"version":2}')
  expect(s.getState().data.entries).toHaveLength(1)
})
test('Review Focus 4・D-8: 読み直すと、ほかのタブが書いた内容になる', () => {
  const m = memory()
  const a = createPlannerStore(m, ids())
  const b = createPlannerStore(m, ids())
  a.load()
  b.load()
  a.addEntries([draft('2026-12-28')])
  b.load()
  b.addEntries([draft('2026-12-29')])
  expect(JSON.parse(m.dump()[STORAGE_KEY]).entries.map((e: { date: string }) => e.date)).toEqual([
    '2026-12-28',
    '2026-12-29',
  ])
})
test('Review Focus 5・D-9: 保存領域が使えなくても、メモリの中では動く', () => {
  const broken = {
    getItem: () => {
      throw new Error('denied')
    },
    setItem: () => {
      throw new Error('denied')
    },
  }
  for (const storage of [null, broken]) {
    const s = createPlannerStore(storage, ids())
    s.load()
    expect(s.getState()).toMatchObject({ ready: true, canSave: false })
    s.addEntries([draft('2026-12-28')])
    expect(s.getState().data.entries).toHaveLength(1)
  }
})
test('D-9: 読めても書けないときは、書けなかった時点で canSave が false になり、メモリの記録は変わる', () => {
  const m = memory()
  const s = createPlannerStore(
    {
      getItem: m.getItem,
      setItem: () => {
        throw new Error('quota')
      },
    },
    ids(),
  )
  s.load()
  expect(s.getState().canSave).toBe(true)
  s.addEntries([draft('2026-12-28')])
  expect(s.getState().canSave).toBe(false)
  expect(s.getState().data.entries).toHaveLength(1)
})
test('F-101・F-405: 付与日と日数を入れる。付与日を変えると、前の付与年の設定を消す', () => {
  const s = createPlannerStore(memory(), ids())
  s.load()
  s.setGrant({ grantDay: '05-01', grantDays: 14, entitlementMinutes: 7000 }, '2026-05-01')
  s.setGrant({ grantDay: '05-01', grantDays: 16, entitlementMinutes: null }, '2027-05-01')
  expect(s.getState().data.settings).toMatchObject({
    grantDay: '05-01',
    grantYears: {
      '2026-05-01': { grantDays: 14, entitlementMinutes: 7000 },
      '2027-05-01': { grantDays: 16, entitlementMinutes: null },
    },
  })
  s.setGrant({ grantDay: '04-01', grantDays: 14, entitlementMinutes: null }, '2026-04-01')
  expect(s.getState().data.settings.grantYears).toEqual({ '2026-04-01': { grantDays: 14, entitlementMinutes: null } })
})
test('§5.3・F-101: 付与日を 05-01 から 04-01 に直すと、設定は新しい付与年の 1 つだけになり、日程は消さずに新しい区切りで数え直す', () => {
  const m = memory({ [STORAGE_KEY]: serializeStored({ version: 1, settings: SHEET.settings, entries: SHEET.entries }) })
  const s = createPlannerStore(m, ids())
  s.load()
  // 付与日を直すモーダルが作る下書き（付与日数はいまの 14 日、使える日数は触らない）
  s.setGrant({ grantDay: '04-01', grantDays: 14, entitlementMinutes: null }, '2026-04-01')
  const { settings, entries } = s.getState().data
  expect(Object.keys(settings.grantYears)).toEqual(['2026-04-01'])
  expect(entries).toHaveLength(12)
  const b = balanceOf({ settings, entries, leaveTypeId: PAID_LEAVE_TYPE_ID, grantYearStart: '2026-04-01' })
  // 2026-04-01〜2027-03-31 の SHEET の日程（所定労働時間 480 分、時間単位の日程は 120 分）
  // 取得済み: 1 日の 5/15・6/22・8/10・11/2 と、2 時間の 5/21・9/4・10/7 → 4 × 480 + 3 × 120 = 2280
  // 予定: 12/28・12/29・2027/2/12・2027/2/22 の 4 日 → 4 × 480 = 1920（2027/4/30 は次の付与年へ移る）
  expect(b).toMatchObject({ entitlement: 14 * 480, taken: 4 * 480 + 3 * 120, planned: 4 * 480 })
  const next = balanceOf({ settings, entries, leaveTypeId: PAID_LEAVE_TYPE_ID, grantYearStart: '2027-04-01' })
  expect(next?.planned).toBe(480) // 2027/4/30 の 1 日
})
test('§5.3: いまの付与年に 18 日の上書きがあり、付与日だけ変えて保存すると、新しい付与年の設定に同じ分の上書きが入る', () => {
  const settings = { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: 18 * 480 } } }
  const m = memory({ [STORAGE_KEY]: serializeStored({ version: 1, settings, entries: SHEET.entries }) })
  const s = createPlannerStore(m, ids())
  s.load()
  // 欄に出ていた 18 × 480 を、保存後の計算 14 × 480（繰り越し 0）と比べて上書きにする
  const entitlementMinutes = grantEntitlementToSave({ mode: 'changeDay', settings, grantDay: '04-01', touched: false, enteredMinutes: 18 * 480, computedMinutes: 14 * 480, existing: null })
  s.setGrant({ grantDay: '04-01', grantDays: 14, entitlementMinutes }, '2026-04-01')
  const saved = s.getState().data
  expect(saved.settings.grantYears).toEqual({ '2026-04-01': { grantDays: 14, entitlementMinutes: 18 * 480 } })
  expect(balanceOf({ settings: saved.settings, entries: saved.entries, leaveTypeId: PAID_LEAVE_TYPE_ID, grantYearStart: '2026-04-01' })?.entitlement).toBe(18 * 480)
})
test('存在しない id の更新と削除は何もしない', () => {
  const m = memory()
  const s = createPlannerStore(m, ids())
  s.load()
  s.addEntries([draft('2026-12-28')])
  const before = s.getState()
  s.updateEntry('nope', draft('2026-12-29'))
  s.removeEntry('nope')
  expect(s.getState()).toBe(before)
})
test('聞き手に知らせ、変わるまで同じ状態のオブジェクトを返す', () => {
  const s = createPlannerStore(memory(), ids())
  s.load()
  let calls = 0
  const off = s.subscribe(() => calls++)
  const before = s.getState()
  expect(s.getState()).toBe(before)
  s.addEntries([draft('2026-12-28')])
  expect(calls).toBe(1)
  expect(s.getState()).not.toBe(before)
  off()
  s.removeEntry('id-1')
  expect(calls).toBe(1)
})
test('D-8: reload は、保存できるストアでは、ほかのストアが書いた内容に替わる', () => {
  const m = memory()
  const a = createPlannerStore(m, ids())
  const b = createPlannerStore(m, ids())
  a.load()
  b.load()
  a.addEntries([draft('2026-12-28')])
  b.reload()
  expect(b.getState().data.entries.map((e) => e.date)).toEqual(['2026-12-28'])
})
test('D-8・D-9: reload は、保存できないストアではメモリの日程を残す', () => {
  const s = createPlannerStore(null, ids())
  s.load()
  s.addEntries([draft('2026-12-28')])
  s.reload()
  expect(s.getState().data.entries).toHaveLength(1)
  const m = memory({ [STORAGE_KEY]: '{"version":2}' })
  const t = createPlannerStore(m, ids())
  t.load()
  t.addEntries([draft('2026-12-29')])
  t.reload()
  expect(t.getState().data.entries).toHaveLength(1)
})
test('D-8: reload は、読み込む前には何もしない', () => {
  const s = createPlannerStore(memory(), ids())
  const before = s.getState()
  s.reload()
  expect(s.getState()).toBe(before)
})

test('F-102・F-108: 所定労働時間と週の始まりを保存する。上書きと時間単位の日程は書き換えない', () => {
  const m = memory(); const s = createPlannerStore(m, ids()); s.load()
  s.setGrant({ grantDay: '05-01', grantDays: 14, entitlementMinutes: 8640 }, '2026-05-01')
  s.addEntries([{ date: '2026-11-16', leaveTypeId: 'paid', amount: { unit: 'minutes', minutes: 480 }, title: '', done: false }])
  s.setWorkMinutes(465)
  s.setWeekStart('sunday')
  const saved = JSON.parse(m.dump()[STORAGE_KEY])
  expect(saved.settings).toMatchObject({ workMinutes: 465, weekStart: 'sunday', grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: 8640 } } })
  expect(saved.entries[0].amount).toEqual({ unit: 'minutes', minutes: 480 }) // 新しい所定労働時間より長くても残す
  expect(parseStored(m.dump()[STORAGE_KEY]).ok).toBe(true)
})

test('F-103: 会社の休日を足す・直す・消す', () => {
  const m = memory(); const s = createPlannerStore(m, ids()); s.load()
  s.saveCompanyHoliday(null, { kind: 'yearly', start: '12-30', end: '01-03' })
  s.saveCompanyHoliday(null, { kind: 'once', start: '2026-08-13', end: '2026-08-16' })
  s.saveCompanyHoliday(0, { kind: 'yearly', start: '12-29', end: '01-03' })
  s.removeCompanyHoliday(1)
  expect(JSON.parse(m.dump()[STORAGE_KEY]).settings.companyHolidays).toEqual([{ kind: 'yearly', start: '12-29', end: '01-03' }])
})
test('F-103: 範囲の外の位置は何もしない', () => {
  const m = memory(); const s = createPlannerStore(m, ids()); s.load()
  s.saveCompanyHoliday(5, { kind: 'yearly', start: '12-29', end: '01-03' })
  s.removeCompanyHoliday(0)
  expect(s.getState().data.settings.companyHolidays).toEqual([])
})

test('F-104・§5.5: 休暇の種類を足す・直す。有休と、日程が残っている種類は消せない', () => {
  const m = memory()
  const s = createPlannerStore(m, ids())
  s.load()
  const d = (patch: object = {}) => ({ name: '夏季休暇', days: 3, usable: { start: '07-01', end: '09-30' }, grantDay: null, together: false, ...patch }) as const
  s.saveLeaveType(null, d())
  s.saveLeaveType('id-1', d({ days: 5, usable: null, grantDay: '01-01', together: true }))
  s.saveLeaveType('paid', d({ name: 'x' }))
  s.addEntries([{ date: '2027-08-02', leaveTypeId: 'id-1', amount: { unit: 'day' }, title: '', done: false }])
  s.removeLeaveType('paid')
  s.removeLeaveType('id-1')
  const saved = JSON.parse(m.dump()[STORAGE_KEY])
  expect(saved.settings.leaveTypes).toEqual([
    { id: 'paid', name: '有休', days: 0, usable: null, grantDay: null, together: false },
    { id: 'id-1', name: '夏季休暇', days: 5, usable: null, grantDay: '01-01', together: true },
  ])
  expect(parseStored(m.dump()[STORAGE_KEY]).ok).toBe(true)
  s.removeEntry('id-2')
  s.removeLeaveType('id-1')
  expect(s.getState().data.settings.leaveTypes.map((t) => t.id)).toEqual(['paid'])
})
