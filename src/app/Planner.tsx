'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AddSheet } from '@/app/components/AddSheet'
import { BalanceCards } from '@/app/components/BalanceCards'
import { EntrySheet } from '@/app/components/EntrySheet'
import { GrantSheet } from '@/app/components/GrantSheet'
import { InviteCard } from '@/app/components/InviteCard'
import { LongBreakStrip } from '@/app/components/LongBreakStrip'
import { Notices } from '@/app/components/Notices'
import { QuarterSection } from '@/app/components/QuarterSection'
import { QuarterTabs } from '@/app/components/QuarterTabs'
import { BELOW_SUMMARY_TOP, StickySummary } from '@/app/components/StickySummary'
import { HolidayNote } from '@/app/components/StaticCandidates'
import { defaultDayFor } from '@/domain/view/defaultDay'
import { APP_DESCRIPTION } from '@/app/site'
import { T } from '@/app/texts'
import { plannerStore, usePlanner } from '@/app/store/usePlanner'
import type { HolidayData } from '@/domain/holidays/importCsv'
import { type IsoDate, todayInJapan, untilNextDayInJapan } from '@/domain/shared/date'
import { type Quarter, hasDatesBefore, quartersBetween } from '@/domain/quarters/quarters'
import { buildQuarterViews } from '@/domain/view/quarterView'
import { buildSummary } from '@/domain/view/summary'

/** 開いている面（1 つだけ）。entry の id が null なら「日を足す」で、その初期の日付を持つ */
type OpenSheet =
  | { kind: 'add'; leaveDays: readonly IsoDate[] }
  | { kind: 'entry'; id: string | null; defaultDate: IsoDate }
  | { kind: 'grant'; grantYearStart: IsoDate | null }
  | null

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
  const [sheet, setSheet] = useState<OpenSheet>(null)
  // 持ち分のカードの包みが画面に見えているか。見えていないあいだだけ、持ち分の 1 行を張り付ける（§3.4）
  const [cardsEl, setCardsEl] = useState<HTMLDivElement | null>(null)
  const [cardsVisible, setCardsVisible] = useState(true)
  useEffect(() => {
    if (cardsEl === null) return
    const observer = new IntersectionObserver(([entry]) => setCardsVisible(entry.isIntersecting))
    observer.observe(cardsEl)
    return () => observer.disconnect()
  }, [cardsEl])
  // PC の「過ぎた四半期の記録を見る」で足した節まで動かすための印（描いたあとに動かす）
  const scrollTarget = useRef<IsoDate | null>(null)
  useEffect(() => {
    if (scrollTarget.current === null) return
    document.getElementById(`quarter-${scrollTarget.current}`)?.scrollIntoView({ block: 'start' })
    scrollTarget.current = null
  }, [shift])

  // 記録・祝日・今日・見せる範囲が変わったときだけ組み立て直す。スマホのタブは shift の位置から 4 つ。
  // PC は、その最初から今日の四半期の 3 つ先まで全部（HTML は 1 つ）
  const built = useMemo(() => {
    if (today === null) return null
    const input = { holidays, settings: data.settings, entries: data.entries, today }
    const shown = quartersBetween(today, shift)
    const tabQuarters = shown.slice(0, 4)
    const canGoBack = hasDatesBefore(data.entries.map((e) => e.date), shown[0])
    return { summary: buildSummary(input), tabQuarters, canGoBack, views: buildQuarterViews(input, shown) }
  }, [data, holidays, today, shift])

  if (!ready || today === null || built === null) {
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
  const { summary, tabQuarters, canGoBack, views } = built
  // 持ち分のカードが画面の外へ流れたあと、スマホと PC の両方で 1 行を張り付ける（§3.4・§4）
  const summaryShown = summary.state === 'set' && !cardsVisible
  const mobileSelected = tabQuarters.find((q) => q.start === selected)?.start ?? tabQuarters[0].start
  const goBack = () => {
    setShift(shift - 1)
    setSelected(null)
  }
  const markDone = (id: string) => {
    const e = entries.find((x) => x.id === id)
    if (e) plannerStore.updateEntry(id, { date: e.date, leaveTypeId: e.leaveTypeId, amount: e.amount, title: e.title, done: true })
  }
  const input = { holidays, settings, entries, today }
  const closeSheet = () => setSheet(null)
  const openAddDay = (quarter: Quarter) => setSheet({ kind: 'entry', id: null, defaultDate: defaultDayFor(input, quarter) })
  const openedEntry = sheet?.kind === 'entry' && sheet.id !== null ? entries.find((e) => e.id === sheet.id) : undefined
  return (
    <>
      <Notices canSave={canSave} unreadable={unreadable} />
      {settings.grantDay === null && <p className="text-sm">{APP_DESCRIPTION}</p>}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-6">
        <div ref={setCardsEl} className="lg:w-1/2">
          {summary.state === 'unset' ? (
            <InviteCard onOpen={() => setSheet({ kind: 'grant', grantYearStart: null })} />
          ) : (
            <BalanceCards summary={summary} workMinutes={settings.workMinutes} />
          )}
        </div>
        <div className="lg:w-1/2">
          <LongBreakStrip summary={summary} />
        </div>
      </div>
      {summaryShown && <StickySummary summary={summary} workMinutes={settings.workMinutes} />}
      <div className={`sticky z-20 bg-white lg:hidden ${summaryShown ? BELOW_SUMMARY_TOP : 'top-0'}`}>
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
              onAdd={(leaveDays) => setSheet({ kind: 'add', leaveDays })}
              onOpen={(id) => setSheet({ kind: 'entry', id, defaultDate: today })}
              onMarkDone={markDone}
              onAddDay={() => openAddDay(view.quarter)}
              onEnterGrant={(grantYearStart) => setSheet({ kind: 'grant', grantYearStart })}
              belowSummary={summaryShown}
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
              scrollTarget.current = quartersBetween(today, shift - 1)[0].start
              goBack()
            }}
            className="hidden min-h-11 shrink-0 text-sm text-primary lg:block"
          >
            {T.viewPast}
          </button>
        )}
      </div>
      {sheet?.kind === 'add' && (
        <AddSheet
          input={input}
          leaveDays={sheet.leaveDays}
          onSubmit={(drafts) => {
            plannerStore.addEntries(drafts)
            closeSheet()
          }}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'entry' && (sheet.id === null || openedEntry !== undefined) && (
        <EntrySheet
          key={sheet.id ?? 'new'}
          input={input}
          entry={openedEntry ?? null}
          defaultDate={sheet.defaultDate}
          onSubmit={(draft) => {
            if (openedEntry) plannerStore.updateEntry(openedEntry.id, draft)
            else plannerStore.addEntries([draft])
            closeSheet()
          }}
          onRemove={() => {
            if (openedEntry) plannerStore.removeEntry(openedEntry.id)
            closeSheet()
          }}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'grant' && (
        <GrantSheet
          key={sheet.grantYearStart ?? 'first'}
          input={input}
          grantYearStart={sheet.grantYearStart}
          onSubmit={(draft, grantYearStart) => {
            plannerStore.setGrant(draft, grantYearStart)
            closeSheet()
          }}
          onClose={closeSheet}
        />
      )}
    </>
  )
}
