'use client'

import { useSyncExternalStore } from 'react'
import { BalanceCards } from '@/app/components/BalanceCards'
import { InviteCard } from '@/app/components/InviteCard'
import { LongBreakStrip } from '@/app/components/LongBreakStrip'
import { Notices } from '@/app/components/Notices'
import { HolidayNote } from '@/app/components/StaticCandidates'
import { APP_DESCRIPTION } from '@/app/site'
import { usePlanner } from '@/app/store/usePlanner'
import type { HolidayData } from '@/domain/holidays/importCsv'
import { type IsoDate, todayInJapan } from '@/domain/shared/date'
import { buildSummary } from '@/domain/view/summary'

/** Task 9 で面を開く操作に差し替える */
const noop = () => {}

// 今日の日付。サーバーの描画とハイドレーションでは null を使い、マウントしたあとに端末の時計から取る。
// useEffect の中で setState すると react-hooks/set-state-in-effect に当たるので、useSyncExternalStore で読む
const subscribeToday = () => () => {}
const todayOnClient = () => todayInJapan(new Date())
const todayOnServer = () => null

/**
 * 主な画面（画面定義書 §2・§3）。記録を読み終えるまでは、サーバーが作った静的な一覧（children）を
 * 見えない状態で描き、読み終えたら端末で組み立てた画面に差し替える。
 * スクリプトが動かないときは page.tsx の <noscript> が見えない状態を打ち消す。
 */
export function Planner({ holidays, children }: { holidays: HolidayData; children: React.ReactNode }) {
  const { ready, data, canSave, unreadable } = usePlanner()
  const today: IsoDate | null = useSyncExternalStore(subscribeToday, todayOnClient, todayOnServer)

  if (!ready || today === null) {
    return (
      <>
        <p className="text-sm">{APP_DESCRIPTION}</p>
        {/* 持ち分の場所。差し替えまで高さを保って空けておく（誘いのカードを一瞬出さない） */}
        <div data-pending-slot aria-hidden className="h-24" />
        <div data-pending-static className="invisible">
          {children}
        </div>
      </>
    )
  }

  const { settings, entries } = data
  const summary = buildSummary({ holidays, settings, entries, today })
  return (
    <>
      <Notices canSave={canSave} unreadable={unreadable} />
      {settings.grantDay === null && <p className="text-sm">{APP_DESCRIPTION}</p>}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-6">
        <div className="lg:w-1/2">
          {summary.state === 'unset' ? (
            <InviteCard onOpen={noop} />
          ) : (
            <BalanceCards summary={summary} workMinutes={settings.workMinutes} />
          )}
        </div>
        <div className="lg:w-1/2">
          <LongBreakStrip summary={summary} />
        </div>
      </div>
      <HolidayNote confirmedUntil={holidays.confirmedUntil} />
    </>
  )
}
