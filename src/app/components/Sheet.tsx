'use client'

import { useEffect, useRef } from 'react'

/** モーダルの題に付ける印（SheetTitle の data-sheet-title）。Sheet は開いたあと、この印の要素に焦点を移す */
export const SHEET_TITLE_ATTR = 'data-sheet-title'

/**
 * モーダルの共通の枠（画面定義書 §5）。標準の <dialog> を、マウントしたときに showModal() で開く。
 * 閉じ方は、Esc（<dialog> の標準の動き。close イベント）、モーダルの外（::backdrop）を押す、中身の「やめる」。
 * 下の画面のスクロールは globals.css の body:has(dialog[open]) で止める。
 * title は読み上げの名前に使う。見える題は、中身の部品が SheetTitle で出す。
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  // 押した所と離した所が、どちらもモーダルの外（dialog 自身）だったか（§5）。中で押して外で離したとき（文字をドラッグで
  // 選んだときなど）と、外で押して中で離したときは閉じない
  const pressedOutside = useRef(false)
  const releasedOutside = useRef(false)
  useEffect(() => {
    const dialog = ref.current
    // StrictMode の開発時は effect が 2 回走る。開いているのに showModal() すると例外になる
    if (dialog === null || dialog.open) return
    dialog.showModal()
    // showModal() は中の最初の入力欄に焦点を移し、スマホではキーボードが出てモーダルを隠す。題に焦点を移し直す。
    // React の autoFocus は入力欄とボタンにしか効かず、showModal() より前に走るので使わない
    dialog.querySelector<HTMLElement>(`[${SHEET_TITLE_ATTR}]`)?.focus()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onPointerDown={(e) => {
        // 中身は padding のある内側の div が全面を覆うので、dialog 自身が押されたのは ::backdrop を押したとき
        pressedOutside.current = e.target === e.currentTarget
        releasedOutside.current = false
      }}
      onPointerUp={(e) => {
        // タッチでは pointerup の target が押した要素のまま（暗黙のキャプチャ）なので、離した位置の要素で見る
        releasedOutside.current = document.elementFromPoint(e.clientX, e.clientY) === e.currentTarget
      }}
      onClick={(e) => {
        // 閉じるのは click まで待つ。pointerup で取り外すと、続く click が下の画面の要素に届きうる
        if (e.target === e.currentTarget && pressedOutside.current && releasedOutside.current) onClose()
        pressedOutside.current = false
        releasedOutside.current = false
      }}
      className="m-0 mx-auto mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-xl bg-white text-ink backdrop:bg-black/50 lg:m-auto lg:max-w-md lg:rounded-xl"
    >
      <div className="space-y-4 p-4">{children}</div>
    </dialog>
  )
}

/** モーダルの題。開いたときに焦点を受ける（tabIndex -1 で、Tab の順には入らない）。焦点の枠は題にだけ出さない */
export function SheetTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 tabIndex={-1} data-sheet-title="" className="text-lg font-bold outline-none">
      {children}
    </h2>
  )
}

/** モーダルの中のボタンの並び。確定を右、やめるをその左に置く（§4）。left は消す操作などで、左下に離して置く */
export function SheetButtons({ left, children }: { left?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>{left}</div>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

export const FIELD_CLASS = 'min-h-11 w-full rounded-md border border-line bg-white px-2'
/** 幅を w-20 などで決める短い欄。FIELD_CLASS の w-full は w-20 より後に出力されて勝つので、幅を含めない */
export const SHORT_FIELD_CLASS = 'min-h-11 shrink-0 rounded-md border border-line bg-white px-2'
export const PRIMARY_BUTTON_CLASS = 'min-h-11 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-40'
export const SECONDARY_BUTTON_CLASS = 'min-h-11 rounded-md border border-line px-4 text-sm'

const LABEL_CLASS = 'block text-sm text-sub'

/** 入力欄の行。ラベルを押すと欄に入る */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={LABEL_CLASS}>{label}</span>
      {children}
    </label>
  )
}

/** 文字だけの行 */
export function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={LABEL_CLASS}>{label}</span>
      {children}
    </div>
  )
}
