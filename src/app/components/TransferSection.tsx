'use client'

import { useRef } from 'react'
import { SECONDARY_BUTTON_CLASS } from '@/app/components/Sheet'
import { T, type TransferNote, transferNoteText } from '@/app/texts'

type Props = {
  note: TransferNote | null
  canRestore: boolean
  onExport: () => void
  /** 「ファイルを読み込む」を押したとき。ファイルを選ばせる前に呼ぶ */
  onStartImport: () => void
  onPickFile: (file: File) => void
  onRestore: () => void
  onExportIcs: () => void
  onClear: () => void
}

const BUTTON_CLASS = `${SECONDARY_BUTTON_CLASS} w-full text-left`

/** §6 の記録の持ち出しの節。状態は持たず、選んだファイルを onPickFile に渡すだけ */
export function TransferSection({ note, canRestore, onExport, onStartImport, onPickFile, onRestore, onExportIcs, onClear }: Props) {
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
        <button type="button" onClick={onExportIcs} className={BUTTON_CLASS}>
          {T.exportIcs}
        </button>
        <button type="button" onClick={onClear} className={BUTTON_CLASS}>
          {T.clearAll}
        </button>
      </div>
      {note !== null &&
        (note === 'unreadableFile' ? (
          <p role="alert" className="text-sm text-danger">
            {transferNoteText(note)}
          </p>
        ) : (
          <p className="text-sm">{transferNoteText(note)}</p>
        ))}
      {canRestore && (
        <button type="button" onClick={onRestore} className={SECONDARY_BUTTON_CLASS}>
          {T.restoreImport}
        </button>
      )}
      <p className="text-sm text-sub">{T.transferNote}</p>
    </section>
  )
}
