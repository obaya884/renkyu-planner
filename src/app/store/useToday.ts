'use client'

import { useSyncExternalStore } from 'react'
import { type IsoDate, todayInJapan, untilNextDayInJapan } from '@/domain/shared/date'

// 今日の日付。サーバーの描画とハイドレーションでは null を使い、マウントしたあとに端末の時計から取る。
// useEffect の中で setState すると react-hooks/set-state-in-effect に当たるので、useSyncExternalStore で読む。
// 見える状態に戻ったときと、次の日本時間 0 時に知らせる。値は文字列なので、同じ日なら描き直さない
const subscribeToday = (notify: () => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = () => {
    // 0 時ちょうどより少し遅らせ、知らせたときに新しい日付が読めるようにする
    timer = setTimeout(() => {
      notify()
      schedule()
    }, untilNextDayInJapan(new Date()) + 1000)
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') notify()
  }
  schedule()
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
const todayOnClient = () => todayInJapan(new Date())
const todayOnServer = () => null

/** 日本の今日。サーバーとハイドレーションでは null */
export function useToday(): IsoDate | null {
  return useSyncExternalStore(subscribeToday, todayOnClient, todayOnServer)
}
