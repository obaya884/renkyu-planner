import type { EntryDraft, GrantDraft } from '@/domain/entries/checkDraft'
import { settingsAfterGrant } from '@/domain/entries/grantInput'
import type { IsoDate } from '@/domain/shared/date'
import type { LeaveTypeDraft } from '@/domain/entries/settingsInput'
import { type CompanyHoliday, PAID_LEAVE_TYPE_ID, type WeekStart } from '@/domain/types'
import { STORAGE_LIMITS, canAdd } from '@/domain/storage/limits'
import { EMPTY_STORED, STORAGE_KEY, type StoredData, UNREADABLE_KEY, isNewerVersion, parseStored, serializeStored } from '@/domain/storage/stored'

export type KeyValueStore = Readonly<{
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}>

export type PlannerState = Readonly<{ ready: boolean; data: StoredData; canSave: boolean; unreadable: boolean }>

export type PlannerStore = Readonly<{
  getState(): PlannerState
  subscribe(listener: () => void): () => void
  load(): void
  /** 読み込んだあとで、保存できるときだけ読み直す（D-8）。保存を止めているときに読み直すと、メモリにだけある記録が消える */
  reload(): void
  /** D-10: 足すと上限（5,000 件）を超えるときは何もしない */
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
  /** F-104。id が null なら newId() で末尾に足す。有休と、無い id は何もしない */
  saveLeaveType(id: string | null, draft: LeaveTypeDraft): void
  /** F-104。有休と、日程が残っている種類は何もしない */
  removeLeaveType(id: string): void
  /**
   * F-505・D-12: 記録の全体を置き換える。ほかの変更と同じく保存し、保存を止めているあいだはメモリだけを置き換える。
   * 読めなかった 1 行（D-5）は消す。値は検証しないので、parseStored を通した記録か、置き換える前に持っておいた記録だけを渡す
   */
  replaceAll(data: StoredData): void
  /**
   * D-13: このアプリが置いたキー（記録と、読めなかった記録の写し）を消し、初めて開いたときと同じ状態にする。
   * 保存を止めているとき（D-3、D-5）も、消せたら保存できる状態に戻す。保存領域が使えないときと、消すのが例外になったときは、メモリの記録だけを空にして保存は止めたまま
   */
  clearAll(): void
}>

const INITIAL: PlannerState = { ready: false, data: EMPTY_STORED, canSave: true, unreadable: false }

/**
 * D-3・D-5〜D-9。保存領域が使えなくても、メモリの中の記録では動き続ける。
 * askToKeep は、ブラウザに保存データを消さないよう頼む関数（D-15）。初めて書けたときに 1 回だけ呼ぶ
 */
export function createPlannerStore(storage: KeyValueStore | null, newId: () => string, askToKeep: () => void = () => {}): PlannerStore {
  let state: PlannerState = INITIAL
  let asked = false
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

  /**
   * D-14: 保存する記録を、読むときと同じ検証に通す。読めない記録になる操作は、state も保存領域も変えずに断る。
   * 検証が項目を落としたとき（R-15 に合わない会社の休日）は、検証を通った側を保存する。断ったときは利用者に知らせない
   */
  const change = (requested: StoredData, extra: Partial<PlannerState> = {}) => {
    const parsed = parseStored(serializeStored(requested))
    if (!parsed.ok) return
    const data = parsed.value
    let canSave = state.canSave
    if (storage !== null && canSave) {
      try {
        storage.setItem(STORAGE_KEY, serializeStored(data))
      } catch {
        canSave = false
      }
      if (canSave && !asked) {
        asked = true
        try {
          askToKeep()
        } catch {
          // D-15: 頼めなくても何も変えない
        }
      }
    }
    publish({ ...state, ...extra, data, canSave })
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
      // D-10: 上限を超える追加は何もしない（記録が読めなくなるのを防ぐ）
      if (!canAdd(state.data.entries.length, drafts.length, STORAGE_LIMITS.entries)) return
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
      change({ ...state.data, settings: settingsAfterGrant(state.data.settings, draft, grantYearStart) })
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
      if (index === null && !canAdd(settings.companyHolidays.length, 1, STORAGE_LIMITS.companyHolidays)) return
      const companyHolidays = index === null ? [...settings.companyHolidays, holiday] : settings.companyHolidays.map((h, i) => (i === index ? holiday : h))
      change({ ...state.data, settings: { ...settings, companyHolidays } })
    },
    removeCompanyHoliday(index) {
      const { settings } = state.data
      if (!(Number.isInteger(index) && index >= 0 && index < settings.companyHolidays.length)) return
      change({ ...state.data, settings: { ...settings, companyHolidays: settings.companyHolidays.filter((_, i) => i !== index) } })
    },
    saveLeaveType(id, draft) {
      const { settings } = state.data
      if (id === PAID_LEAVE_TYPE_ID) return
      if (id !== null && !settings.leaveTypes.some((t) => t.id === id)) return
      if (id === null && !canAdd(settings.leaveTypes.length, 1, STORAGE_LIMITS.leaveTypes)) return
      const leaveTypes =
        id === null ? [...settings.leaveTypes, { id: newId(), ...draft }] : settings.leaveTypes.map((t) => (t.id === id ? { id, ...draft } : t))
      change({ ...state.data, settings: { ...settings, leaveTypes } })
    },
    removeLeaveType(id) {
      const { settings, entries } = state.data
      if (id === PAID_LEAVE_TYPE_ID || entries.some((e) => e.leaveTypeId === id)) return
      if (!settings.leaveTypes.some((t) => t.id === id)) return
      change({ ...state.data, settings: { ...settings, leaveTypes: settings.leaveTypes.filter((t) => t.id !== id) } })
    },
    replaceAll(data) {
      change(data, { unreadable: false })
    },
    clearAll() {
      // change は通さない。保存を止めている状態でも消す必要があり、空の記録は検証する意味が無い
      let canSave = false
      if (storage !== null) {
        try {
          storage.removeItem(STORAGE_KEY)
          storage.removeItem(UNREADABLE_KEY)
          canSave = true
        } catch {
          // 消せなかったら、書き込みも止める
        }
      }
      publish({ ready: true, data: EMPTY_STORED, canSave, unreadable: false })
    },
  }
}
