'use client'

import { PRIMARY_BUTTON_CLASS, Sheet, SheetTitle } from '@/app/components/Sheet'
import { T, homeGuideBody, homePromptBody } from '@/app/texts'
import type { GuideBrowser } from '@/domain/transfer/homeScreen'

/** 1-A: 主な画面の説明文の下の、畳んだカード（試作）。出すかは呼ぶ側が決める */
export function HomeGuideCard({ browser, onOpen, onClose }: { browser: GuideBrowser; onOpen: () => void; onClose: () => void }) {
  return (
    <div className="relative rounded-lg border border-l-4 border-line border-l-primary bg-white px-3 py-2">
      <button type="button" onClick={onClose} className="absolute top-0 right-0 min-h-11 px-3 text-xs text-sub">
        {T.homeGuideClose}
      </button>
      <div className="pr-14 text-sm font-bold">{T.homeGuideTitle}</div>
      <p className="text-xs text-sub">{homeGuideBody(browser)}</p>
      <button type="button" onClick={onOpen} className="min-h-11 text-sm font-bold text-primary">
        {T.homeGuideOpen}
      </button>
    </div>
  )
}

type PromptProps = { browser: GuideBrowser; onGo: () => void; onLater: () => void }

/** 1-C: 初めて保存した直後に、下から出す勧め（試作）の中身 */
export function HomePromptSheetBody({ browser, onGo, onLater }: PromptProps) {
  return (
    <>
      <SheetTitle>{T.homePromptTitle}</SheetTitle>
      <p className="text-sm">{homePromptBody(browser)}</p>
      <p className="text-sm font-bold">{T.homePromptStrong}</p>
      <div className="space-y-1">
        <button type="button" onClick={onGo} className={`${PRIMARY_BUTTON_CLASS} w-full`}>
          {T.homePromptGo}
        </button>
        <button type="button" onClick={onLater} className="min-h-11 w-full px-4 text-sm text-sub">
          {T.homePromptLater}
        </button>
      </div>
    </>
  )
}

export function HomePromptSheet(props: PromptProps) {
  return (
    <Sheet title={T.homePromptTitle} onClose={props.onLater}>
      <HomePromptSheetBody {...props} />
    </Sheet>
  )
}
