'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { STORAGE_KEY } from '@/domain/storage/stored'
import { type KeyValueStore, type PlannerState, createPlannerStore } from './createPlannerStore'
import { newId } from './newId'

/** window.localStorage を読むだけで SecurityError になるブラウザがあるので、例外なら使えないものとして扱う */
function browserStorage(): KeyValueStore | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * D-15: ブラウザに、このサイトの保存データを消さないよう頼む。仕組みが無いブラウザや断られたときは何もしない。
 * Firefox は、ここで利用者に確かめる画面を出す
 */
function askBrowserToKeep(): void {
  void navigator.storage?.persist?.().catch(() => {})
}

export const plannerStore = createPlannerStore(browserStorage(), () => newId(crypto), askBrowserToKeep)

/** サーバーの描画とハイドレーションでは、初めの状態を使う。マウントしたあとに読み込む */
export function usePlanner(): PlannerState {
  const state = useSyncExternalStore(plannerStore.subscribe, plannerStore.getState, plannerStore.getState)
  useEffect(() => {
    // 2 つ目の部品がこのフックを呼んでも、読み直さない（メモリにだけある記録を消さないため）
    if (!plannerStore.getState().ready) plannerStore.load()
    // D-8: ほかのタブが書いたとき、ページが復元されたとき、見える状態に戻ったときに読み直す
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) plannerStore.reload()
    }
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) plannerStore.reload()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') plannerStore.reload()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  return state
}
