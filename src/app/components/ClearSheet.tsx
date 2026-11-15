'use client'

import { SECONDARY_BUTTON_CLASS, Sheet, SheetButtons, SheetTitle } from '@/app/components/Sheet'
import { T } from '@/app/texts'

type Props = { showHint: boolean; onSubmit: () => void; onClose: () => void }

/** §5.7 の中身。消すと元に戻せないことと、先に書き出す手（showHint のとき）を伝える */
export function ClearSheetBody({ showHint, onSubmit, onClose }: Props) {
  return (
    <>
      <SheetTitle>{T.clearTitle}</SheetTitle>
      <p className="font-bold">{T.clearConfirm}</p>
      {showHint && <p className="text-sm text-sub">{T.clearHint}</p>}
      <SheetButtons>
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
          {T.cancel}
        </button>
        <button type="button" onClick={onSubmit} className="min-h-11 rounded-md bg-danger px-4 text-sm font-bold text-white">
          {T.clearSubmit}
        </button>
      </SheetButtons>
    </>
  )
}

export function ClearSheet(props: Props) {
  return (
    <Sheet title={T.clearTitle} onClose={props.onClose}>
      <ClearSheetBody {...props} />
    </Sheet>
  )
}
