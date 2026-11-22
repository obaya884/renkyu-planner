'use client'

import { useSyncExternalStore } from 'react'
import { type HomeScreenAudience, homeScreenAudience } from '@/domain/transfer/homeScreen'

/** ホーム画面のアプリとして開いているか。iOS の Safari は navigator.standalone、ほかは display-mode で見る */
function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true
}

function audienceOnClient(): HomeScreenAudience {
  return homeScreenAudience({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone: isStandalone(),
    // PoC 用の抜け道。アドレスに ?guide=1 を付けると、どの端末でも案内を出す。
    // useSearchParams を使うと / が動的なページになるので、端末で window.location.search を読む
    forced: new URLSearchParams(window.location.search).get('guide') === '1',
  })
}
const audienceOnServer = () => null
// 開いているあいだに変わるものではないので、知らせない
const subscribeNothing = () => () => {}

/**
 * ホーム画面への追加の案内（試作）を出す相手。サーバーの描画とハイドレーションでは null を返し、案内を最初の HTML に入れない
 */
export function useHomeScreenAudience(): HomeScreenAudience | null {
  return useSyncExternalStore(subscribeNothing, audienceOnClient, audienceOnServer)
}
