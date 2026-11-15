import type { EntryDraft, GrantDraft } from '@/domain/entries/checkDraft'
import type { IsoDate } from '@/domain/shared/date'
import type { CompanyHoliday, WeekStart } from '@/domain/types'
import { EMPTY_STORED, STORAGE_KEY, type StoredData, UNREADABLE_KEY, isNewerVersion, parseStored, serializeStored } from '@/domain/storage/stored'

export type KeyValueStore = Readonly<{
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}>

export type PlannerState = Readonly<{ ready: boolean; data: StoredData; canSave: boolean; unreadable: boolean }>

export type PlannerStore = Readonly<{
  getState(): PlannerState
  subscribe(listener: () => void): () => void
  load(): void
  /** 読み込んだあとで、保存できるときだけ読み直す（D-8）。保存を止めているときに読み直すと、メモリにだけある記録が消える */
  reload(): void
  addEntries(drafts: readonly EntryDraft[]): void
  updateEntry(id: string, draft: EntryDraft): void
  removeEntry(id: string): void
  setGrant(draft: GrantDraft, grantYearStart: IsoDate): void
  /** F-102。持ち分の上書きと時間単位の日程は分のまま触らない（12 §5.1） */
  setWorkMinutes(minutes: number): void
  /** F-108 */
  setWeekStart(weekStart: WeekStart): void
  /** F-103。index が null なら末尾に足す。範囲の外の index は何もしない */
  saveCompanyHoliday(index: number | null, holiday: CompanyHoliday): void
  /** F-103 */
  removeCompanyHoliday(index: number): void
}>

const INITIAL: PlannerState = { ready: false, data: EMPTY_STORED, canSave: true, unreadable: false }

/** D-3・D-5〜D-9。保存領域が使えなくても、メモリの中の記録では動き続ける */
export function createPlannerStore(storage: KeyValueStore | null, newId: () => string): PlannerStore {
  let state: PlannerState = INITIAL
  const listeners = new Set<() => void>()

  const publish = (next: PlannerState) => {
    state = next
    for (const listener of [...listeners]) listener()
  }

  const load = () => {
    if (storage === null) return publish({ ready: true, data: EMPTY_STORED, canSave: false, unreadable: false })
    let text: string | null
    try {
      text = storage.getItem(STORAGE_KEY)
    } catch {
      return publish({ ready: true, data: EMPTY_STORED, canSave: false, unreadable: false })
    }
    if (text === null) return publish({ ready: true, data: EMPTY_STORED, canSave: true, unreadable: false })
    const parsed = parseStored(text)
    if (parsed.ok) return publish({ ready: true, data: parsed.value, canSave: true, unreadable: false })
    try {
      storage.setItem(UNREADABLE_KEY, text)
    } catch {
      // 写しが無いまま上書きすると元の記録を失うので、保存を止める（D-5）
      return publish({ ready: true, data: EMPTY_STORED, canSave: false, unreadable: true })
    }
    // 新しい版の記録は、写しを取れても上書きしない（D-3）
    return publish({ ready: true, data: EMPTY_STORED, canSave: !isNewerVersion(text), unreadable: true })
  }

  const change = (data: StoredData) => {
    let canSave = state.canSave
    if (storage !== null && canSave) {
      try {
        storage.setItem(STORAGE_KEY, serializeStored(data))
      } catch {
        canSave = false
      }
    }
    publish({ ...state, data, canSave })
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    load,
    reload() {
      if (state.ready && state.canSave) load()
    },
    addEntries(drafts) {
      const added = drafts.map((d) => ({ id: newId(), ...d }))
      change({ ...state.data, entries: [...state.data.entries, ...added] })
    },
    updateEntry(id, draft) {
      if (!state.data.entries.some((e) => e.id === id)) return
      change({ ...state.data, entries: state.data.entries.map((e) => (e.id === id ? { id, ...draft } : e)) })
    },
    removeEntry(id) {
      if (!state.data.entries.some((e) => e.id === id)) return
      change({ ...state.data, entries: state.data.entries.filter((e) => e.id !== id) })
    },
    setGrant(draft, grantYearStart) {
      const { settings } = state.data
      // 付与日が変わると、キー（付与年の開始日）が合わなくなるので、前の付与年の設定は消す
      const kept = draft.grantDay === settings.grantDay ? settings.grantYears : {}
      const grantYears = { ...kept, [grantYearStart]: { grantDays: draft.grantDays, entitlementMinutes: draft.entitlementMinutes } }
      change({ ...state.data, settings: { ...settings, grantDay: draft.grantDay, grantYears } })
    },
    setWorkMinutes(minutes) {
      change({ ...state.data, settings: { ...state.data.settings, workMinutes: minutes } })
    },
    setWeekStart(weekStart) {
      change({ ...state.data, settings: { ...state.data.settings, weekStart } })
    },
    saveCompanyHoliday(index, holiday) {
      const { settings } = state.data
      if (index !== null && !(Number.isInteger(index) && index >= 0 && index < settings.companyHolidays.length)) return
      const companyHolidays = index === null ? [...settings.companyHolidays, holiday] : settings.companyHolidays.map((h, i) => (i === index ? holiday : h))
      change({ ...state.data, settings: { ...settings, companyHolidays } })
    },
    removeCompanyHoliday(index) {
      const { settings } = state.data
      if (!(Number.isInteger(index) && index >= 0 && index < settings.companyHolidays.length)) return
      change({ ...state.data, settings: { ...settings, companyHolidays: settings.companyHolidays.filter((_, i) => i !== index) } })
    },
  }
}
