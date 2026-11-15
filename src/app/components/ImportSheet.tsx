'use client'

import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, Sheet, SheetButtons, SheetTitle } from '@/app/components/Sheet'
import { T, importCountsText } from '@/app/texts'
import type { ImportCounts } from '@/domain/transfer/importCounts'

type Props = { counts: ImportCounts; onSubmit: () => void; onClose: () => void }

/** §5.6 の中身。読み込む件数と、いまの記録が置き換わることを出す */
export function ImportSheetBody({ counts, onSubmit, onClose }: Props) {
  return (
    <>
      <SheetTitle>{T.importTitle}</SheetTitle>
      <p>{importCountsText(counts)}</p>
      <p className="font-bold">{T.importConfirm}</p>
      <SheetButtons>
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
          {T.cancel}
        </button>
        <button type="button" onClick={onSubmit} className={PRIMARY_BUTTON_CLASS}>
          {T.importSubmit}
        </button>
      </SheetButtons>
    </>
  )
}

export function ImportSheet(props: Props) {
  return (
    <Sheet title={T.importTitle} onClose={props.onClose}>
      <ImportSheetBody {...props} />
    </Sheet>
  )
}
