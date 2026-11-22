'use client'

import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, Sheet, SheetButtons, SheetTitle } from '@/app/components/Sheet'
import { T, importCountsText } from '@/app/texts'
import type { ImportCounts } from '@/domain/transfer/importCounts'

type Props = {
  counts: ImportCounts
  onSubmit: () => void
  onClose: () => void
  /** 題。省くと「このリンクの記録を読み込みますか」。ホーム画面のアプリでは「記録を読み込みますか」（試作） */
  title?: string
  /** 題の下の 1 文（試作。ホーム画面のアプリのとき） */
  lead?: string
}

/** 控えのリンク（試作）を開いたときに確かめるモーダルの中身。ファイルの読み込み（§5.6）と同じ件数と、置き換わることを出す */
export function BackupLinkSheetBody({ counts, onSubmit, onClose, title = T.backupLinkTitle, lead }: Props) {
  return (
    <>
      <SheetTitle>{title}</SheetTitle>
      {lead !== undefined && <p>{lead}</p>}
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
    <Sheet title={props.title ?? T.backupLinkTitle} onClose={props.onClose}>
      <BackupLinkSheetBody {...props} />
    </Sheet>
  )
}
