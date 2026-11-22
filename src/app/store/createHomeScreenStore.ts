import { type IsoDate, isValidIsoDate } from '@/domain/shared/date'
import type { KeyValueStore } from './createPlannerStore'

/** ホーム画面への追加の案内（試作）が覚えること。記録とは別のキーに置き、記録を消しても残す */
export const HOME_SCREEN_KEY = 'renkyu-planner:home-screen'

export type HomeScreenFlags = Readonly<{
  /** 主な画面の上のカード（1-A）で「あとで」を押したとき、また出す最初の日。押していなければ null */
  guideHiddenUntil: IsoDate | null
  /** 初めて保存したあとの勧め（1-C）を出した */
  prompted: boolean
}>

type Saved = HomeScreenFlags & Readonly<{ backupMark: string | null }>

export type HomeScreenStore = Readonly<{
  getState(): HomeScreenFlags
  subscribe(listener: () => void): () => void
  /** カードを until の前の日まで隠す */
  hideGuideUntil(until: IsoDate): void
  markPrompted(): void
  /** ホーム画面のアプリで、この控え（目印）をもう読み込んだか「やめる」を押したか */
  seenBackup(mark: string): boolean
  rememberBackup(mark: string): void
}>

const INITIAL: Saved = { guideHiddenUntil: null, prompted: false, backupMark: null }

function readSaved(storage: KeyValueStore | null): Saved {
  try {
    const text = storage?.getItem(HOME_SCREEN_KEY) ?? null
    if (text === null) return INITIAL
    const v: unknown = JSON.parse(text)
    if (typeof v !== 'object' || v === null) return INITIAL
    const o = v as Readonly<Record<string, unknown>>
    return { guideHiddenUntil: typeof o.guideHiddenUntil === 'string' && isValidIsoDate(o.guideHiddenUntil) ? o.guideHiddenUntil : null, prompted: o.prompted === true, backupMark: typeof o.backupMark === 'string' ? o.backupMark : null }
  } catch {
    return INITIAL
  }
}

/** 試作。初めて読むときに保存領域から読み、書けなくてもメモリの中では覚える */
export function createHomeScreenStore(storage: KeyValueStore | null): HomeScreenStore {
  let saved: Saved | null = null
  let flags: HomeScreenFlags | null = null
  const listeners = new Set<() => void>()
  const current = (): Saved => (saved ??= readSaved(storage))
  const write = (next: Saved) => {
    saved = next
    flags = null
    try {
      storage?.setItem(HOME_SCREEN_KEY, JSON.stringify(next))
    } catch {
      // 書けなければメモリの中だけで覚える
    }
    for (const listener of [...listeners]) listener()
  }
  return {
    getState() {
      const s = current()
      // useSyncExternalStore が同じ値とみなせるよう、変わるまで同じオブジェクトを返す
      return (flags ??= { guideHiddenUntil: s.guideHiddenUntil, prompted: s.prompted })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    hideGuideUntil: (until) => write({ ...current(), guideHiddenUntil: until }),
    markPrompted: () => write({ ...current(), prompted: true }),
    seenBackup: (mark) => current().backupMark === mark,
    rememberBackup: (mark) => write({ ...current(), backupMark: mark }),
  }
}
