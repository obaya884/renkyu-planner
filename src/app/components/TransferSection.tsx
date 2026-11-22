'use client'

import { useRef } from 'react'
import { FIELD_CLASS, Field, SECONDARY_BUTTON_CLASS } from '@/app/components/Sheet'
import { T, type TransferNote, backupLinkLengthText, transferNoteText } from '@/app/texts'
import type { LinkShown } from '@/app/transfer/transferState'

type Props = {
  note: TransferNote | null
  canRestore: boolean
  /** 控えのリンク（試作）を作ったあとに出すもの */
  link: LinkShown | null
  onExport: () => void
  /** 「控えのリンクを作る」を押したとき（試作） */
  onMakeLink: () => void
  /** 「ファイルを読み込む」を押したとき。ファイルを選ばせる前に呼ぶ */
  onStartImport: () => void
  onPickFile: (file: File) => void
  onRestore: () => void
  onExportIcs: () => void
  onClear: () => void
}

const BUTTON_CLASS = `${SECONDARY_BUTTON_CLASS} w-full text-left`

/** §6 の記録の持ち出しの節。状態は持たず、選んだファイルを onPickFile に渡すだけ */
export function TransferSection({ note, canRestore, link, onExport, onMakeLink, onStartImport, onPickFile, onRestore, onExportIcs, onClear }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-sub">{T.transferSection}</h2>
      <div className="space-y-2">
        <button type="button" onClick={onExport} className={BUTTON_CLASS}>
          {T.exportFile}
        </button>
        <button type="button" onClick={() => {
            onStartImport()
            fileInput.current?.click()
          }} className={BUTTON_CLASS}>
          {T.importFile}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.currentTarget.files?.[0]
            // 同じファイルを続けて選んでも change が起きるよう、欄を空に戻す
            e.currentTarget.value = ''
            if (file !== undefined) onPickFile(file)
          }}
        />
        <button type="button" onClick={onMakeLink} className={BUTTON_CLASS}>
          {T.makeBackupLink}
        </button>
        <button type="button" onClick={onExportIcs} className={BUTTON_CLASS}>
          {T.exportIcs}
        </button>
        <button type="button" onClick={onClear} className={BUTTON_CLASS}>
          {T.clearAll}
        </button>
      </div>
      {note !== null &&
        (note === 'unreadableFile' || note === 'linkFailed' ? (
          <p role="alert" className="text-sm text-danger">
            {transferNoteText(note)}
          </p>
        ) : (
          <p className="text-sm">{transferNoteText(note)}</p>
        ))}
      {link !== null && link.url !== null && (
        <Field label={T.backupLinkFieldLabel}>
          <input type="text" readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className={FIELD_CLASS} />
        </Field>
      )}
      {link !== null && <p className="text-xs text-sub">{backupLinkLengthText(link.length)}</p>}
      {canRestore && (
        <button type="button" onClick={onRestore} className={SECONDARY_BUTTON_CLASS}>
          {T.restoreImport}
        </button>
      )}
      <p className="text-sm text-sub">{T.transferNote}</p>
    </section>
  )
}
