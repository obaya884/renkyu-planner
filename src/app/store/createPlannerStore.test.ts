import { expect, test } from 'vitest'
import { EMPTY_STORED, STORAGE_KEY, UNREADABLE_KEY } from '@/domain/storage/stored'
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
  s.setGrant({ grantDay: '05-01', grantDays: 14, carryOverMinutes: 0 }, '2026-05-01')
  s.setGrant({ grantDay: '05-01', grantDays: 16, carryOverMinutes: 2040 }, '2027-05-01')
  expect(s.getState().data.settings).toMatchObject({
    grantDay: '05-01',
    grantYears: {
      '2026-05-01': { grantDays: 14, carryOverMinutes: 0 },
      '2027-05-01': { grantDays: 16, carryOverMinutes: 2040 },
    },
  })
  s.setGrant({ grantDay: '04-01', grantDays: 14, carryOverMinutes: 0 }, '2026-04-01')
  expect(s.getState().data.settings.grantYears).toEqual({ '2026-04-01': { grantDays: 14, carryOverMinutes: 0 } })
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
