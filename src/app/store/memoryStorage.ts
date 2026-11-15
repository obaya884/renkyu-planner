import type { KeyValueStore } from './createPlannerStore'

/** テスト用の、メモリの中の保存領域。dump で中身を見る */
export function memoryStorage(init: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } {
  const m = new Map(Object.entries(init))
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  }
}
