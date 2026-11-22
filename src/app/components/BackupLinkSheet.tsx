'use client'

import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, Sheet, SheetButtons, SheetTitle } from '@/app/components/Sheet'
import { T, importCountsText } from '@/app/texts'
import type { ImportCounts } from '@/domain/transfer/importCounts'

type Props = { counts: ImportCounts; onSubmit: () => void; onClose: () => void }

/** 控えのリンク（試作）を開いたときに確かめるモーダルの中身。ファイルの読み込み（§5.6）と同じ件数と、置き換わることを出す */
export function BackupLinkSheetBody({ counts, onSubmit, onClose }: Props) {
  return (
    <>
      <SheetTitle>{T.backupLinkTitle}</SheetTitle>
      <p>{importCountsText(counts)}</p>
      <p className="font-bold">{T.importConfirm}</p>
      <SheetButtons>
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
          {T.cancel}
        </button>
        <button type="button" onClick={onSubmit} className={PRIMARY_BUTTON_CLASS}>
          {T.backupLinkSubmit}
        </button>
      </SheetButtons>
    </>
  )
}

export function BackupLinkSheet(props: Props) {
  return (
    <Sheet title={T.backupLinkTitle} onClose={props.onClose}>
      <BackupLinkSheetBody {...props} />
    </Sheet>
  )
}
