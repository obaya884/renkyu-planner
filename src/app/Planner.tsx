'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { BalanceCards } from '@/app/components/BalanceCards'
import { InviteCard } from '@/app/components/InviteCard'
import { LongBreakStrip } from '@/app/components/LongBreakStrip'
import { Notices } from '@/app/components/Notices'
import { QuarterSection } from '@/app/components/QuarterSection'
import { QuarterTabs } from '@/app/components/QuarterTabs'
import { StickySummary } from '@/app/components/StickySummary'
import { HolidayNote } from '@/app/components/StaticCandidates'
import { APP_DESCRIPTION } from '@/app/site'
import { T } from '@/app/texts'
import { plannerStore, usePlanner } from '@/app/store/usePlanner'
import type { HolidayData } from '@/domain/holidays/importCsv'
import { type IsoDate, todayInJapan } from '@/domain/shared/date'
import { planningQuarters } from '@/domain/quarters/quarters'
import { buildQuarterViews } from '@/domain/view/quarterView'
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
  // 「‹ 前」で 1 減らし、「次 ›」で 1 増やす（0 以下）。selected が null なら、いちばん左の四半期を開く
  const [shift, setShift] = useState(0)
  const [selected, setSelected] = useState<IsoDate | null>(null)
  // PC の「過ぎた四半期の記録を見る」で足した節まで動かすための印（描いたあとに動かす）
  const scrollTarget = useRef<IsoDate | null>(null)
  useEffect(() => {
    if (scrollTarget.current === null) return
    document.getElementById(`quarter-${scrollTarget.current}`)?.scrollIntoView({ block: 'start' })
    scrollTarget.current = null
  }, [shift])

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

  // スマホのタブは shift の位置から 4 つ。PC は、その最初から今日の四半期の 3 つ先まで全部（HTML は 1 つ）
  const tabQuarters = planningQuarters(today, shift)
  const shown = [...tabQuarters.slice(0, -shift), ...planningQuarters(today)]
  const views = buildQuarterViews({ holidays, settings, entries, today }, shown)
  const mobileSelected = tabQuarters.find((q) => q.start === selected)?.start ?? tabQuarters[0].start
  const canGoBack = entries.some((e) => e.date < shown[0].start)
  const goBack = () => {
    setShift(shift - 1)
    setSelected(null)
  }
  const markDone = (id: string) => {
    const e = entries.find((x) => x.id === id)
    if (e) plannerStore.updateEntry(id, { date: e.date, leaveTypeId: e.leaveTypeId, amount: e.amount, title: e.title, done: true })
  }
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
      <div className="sticky top-0 z-20 bg-white lg:hidden">
        {summary.state === 'set' && <StickySummary summary={summary} workMinutes={settings.workMinutes} />}
        <QuarterTabs
          quarters={tabQuarters}
          selected={mobileSelected}
          onSelect={setSelected}
          canGoBack={canGoBack}
          canGoForward={shift < 0}
          onBack={goBack}
          onForward={() => {
            setShift(shift + 1)
            setSelected(null)
          }}
        />
      </div>
      <div className="space-y-6">
        {views.map((view) => (
          <div
            key={view.quarter.start}
            id={`quarter-${view.quarter.start}`}
            className={view.quarter.start === mobileSelected ? '' : 'hidden lg:block'}
          >
            <QuarterSection
              view={view}
              workMinutes={settings.workMinutes}
              leaveTypes={settings.leaveTypes}
              onAdd={noop}
              onOpen={noop}
              onMarkDone={markDone}
              onAddDay={noop}
              onEnterGrant={noop}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <HolidayNote confirmedUntil={holidays.confirmedUntil} />
        {canGoBack && (
          <button
            type="button"
            onClick={() => {
              scrollTarget.current = planningQuarters(today, shift - 1)[0].start
              goBack()
            }}
            className="hidden min-h-11 shrink-0 text-sm text-primary lg:block"
          >
            {T.viewPast}
          </button>
        )}
      </div>
    </>
  )
}
