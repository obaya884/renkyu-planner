'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { STORAGE_KEY } from '@/domain/storage/stored'
import { type KeyValueStore, type PlannerState, createPlannerStore } from './createPlannerStore'

/** window.localStorage を読むだけで SecurityError になるブラウザがあるので、例外なら使えないものとして扱う */
function browserStorage(): KeyValueStore | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const plannerStore = createPlannerStore(browserStorage(), () => crypto.randomUUID())

/** サーバーの描画とハイドレーションでは、初めの状態を使う。マウントしたあとに読み込む */
export function usePlanner(): PlannerState {
  const state = useSyncExternalStore(plannerStore.subscribe, plannerStore.getState, plannerStore.getState)
  useEffect(() => {
    plannerStore.load()
    // D-8: ほかのタブが書いたら読み直す
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) plannerStore.load()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return state
}
