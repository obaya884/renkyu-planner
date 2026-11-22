'use client'

import { useSyncExternalStore } from 'react'
import { type HomeScreenFlags, createHomeScreenStore } from './createHomeScreenStore'
import { browserStorage } from './usePlanner'

/** ホーム画面への追加の案内（試作）が覚えること。localStorage に触るのはここ（store）だけ */
export const homeScreenStore = createHomeScreenStore(browserStorage())

// サーバーの描画とハイドレーションでは、案内を出さない側の値を使う
const SERVER_FLAGS: HomeScreenFlags = { guideClosed: true, prompted: true }
const serverFlags = () => SERVER_FLAGS

export function useHomeScreenFlags(): HomeScreenFlags {
  return useSyncExternalStore(homeScreenStore.subscribe, homeScreenStore.getState, serverFlags)
}
