'use client'

import { useSyncExternalStore } from 'react'
import { HOME_SCREEN_KEY, type HomeScreenFlags, createHomeScreenStore } from './createHomeScreenStore'
import { browserStorage } from './usePlanner'

/** ホーム画面への追加の案内（試作）が覚えること。localStorage に触るのはここ（store）だけ */
export const homeScreenStore = createHomeScreenStore(resetIfAsked(browserStorage()))

/** PoC 用の抜け道。アドレスに ?guide=reset を付けて開くと、「閉じる」を押したことなどの覚えを消して、案内を初めから出す */
function resetIfAsked<S extends { removeItem(key: string): void } | null>(storage: S): S {
  try {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('guide') === 'reset') storage?.removeItem(HOME_SCREEN_KEY)
  } catch {
    // 消せなければ、そのまま
  }
  return storage
}

// サーバーの描画とハイドレーションでは、案内を出さない側の値を使う
const SERVER_FLAGS: HomeScreenFlags = { guideHiddenUntil: '9999-12-31', prompted: true }
const serverFlags = () => SERVER_FLAGS

export function useHomeScreenFlags(): HomeScreenFlags {
  return useSyncExternalStore(homeScreenStore.subscribe, homeScreenStore.getState, serverFlags)
}
