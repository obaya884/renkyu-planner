'use client'

import { PRIMARY_BUTTON_CLASS, Sheet, SheetTitle } from '@/app/components/Sheet'
import { T, homeMoveLead, homeNoMoveText, homeStep1Before } from '@/app/texts'
import type { GuideBrowser } from '@/domain/transfer/homeScreen'
import type { HomeSheetView } from '@/app/transfer/createHomeSheetStore'

/** Safari と Chrome の共有のボタンの絵（モック 2026-11-22 の inline SVG）。試作 */
export function ShareIcon() {
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded bg-card align-middle" role="img" aria-label={T.homeShareIconLabel}>
      <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-[#0a84ff] stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 15V3M8 7l4-4 4 4M6 11H5v9h14v-9h-1" />
      </svg>
    </span>
  )
}

/** 共有のメニューの「ホーム画面に追加」の絵（モックの inline SVG）。試作 */
export function AddToHomeIcon() {
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded bg-card align-middle" role="img" aria-label={T.homeAddIconLabel}>
      <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-[#0a84ff] stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    </span>
  )
}

const KEY_CLASS = 'rounded bg-card px-1.5 font-bold whitespace-nowrap'

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 border-t border-line py-2 text-sm first:border-t-0">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white" aria-hidden>
        {n}
      </span>
      <span className="flex flex-wrap items-center gap-1">{children}</span>
    </li>
  )
}

/** 手順の 3 歩（モックの 2）。共有のボタン → 「ホーム画面に追加」→「追加」 */
export function HomeSteps({ browser }: { browser: GuideBrowser }) {
  return (
    <ol className="list-none p-0">
      <Step n={1}>
        {homeStep1Before(browser)} <ShareIcon /> {T.homeStep1After}
      </Step>
      <Step n={2}>
        {T.homeStep2Before} <span className={KEY_CLASS}>{T.homeStep2Key}</span> <AddToHomeIcon /> {T.homeStep2After}
      </Step>
      <Step n={3}>
        {T.homeStep3Before} <span className={KEY_CLASS}>{T.homeStep3Key}</span> {T.homeStep3After}
      </Step>
    </ol>
  )
}

type Props = { view: HomeSheetView; browser: GuideBrowser; onMove: () => void; onSkip: () => void; onClose: () => void }

const WIDE_PRIMARY = `${PRIMARY_BUTTON_CLASS} w-full`
const WIDE_SECONDARY = 'min-h-11 w-full px-4 text-sm text-sub'

/** ホーム画面に追加する手順のモーダルの中身（試作。モックの 2・3-1・3-2）。view を描くだけ */
export function HomeScreenSheetBody({ view, browser, onMove, onSkip, onClose }: Props) {
  if (view.kind === 'choose') {
    return (
      <>
        <SheetTitle>{T.homeStepsTitle}</SheetTitle>
        <p className="text-sm">{homeMoveLead(view.entryCount, browser)}</p>
        <div className="space-y-1">
          <button type="button" onClick={onMove} disabled={view.preparing} className={WIDE_PRIMARY}>
            {T.homeMoveGo}
          </button>
          <button type="button" onClick={onSkip} className={WIDE_SECONDARY}>
            {T.homeMoveSkip}
          </button>
        </div>
      </>
    )
  }
  const ready = view.kind === 'ready'
  return (
    <>
      <SheetTitle>{ready ? T.homeReadyTitle : T.homeStepsTitle}</SheetTitle>
      {ready && <p className="text-sm">{T.homeReadyLead}</p>}
      {view.kind === 'noMove' && <p className="text-sm">{homeNoMoveText(view.reason, browser)}</p>}
      <HomeSteps browser={browser} />
      <p className="text-sm">{ready ? T.homeReadyAfter : T.homeStepsAfter}</p>
      <button type="button" onClick={onClose} className={WIDE_SECONDARY}>
        {ready ? T.cancel : T.close}
      </button>
    </>
  )
}

export function HomeScreenSheet(props: Props) {
  return (
    <Sheet title={T.homeStepsTitle} onClose={props.onClose}>
      <HomeScreenSheetBody {...props} />
    </Sheet>
  )
}
