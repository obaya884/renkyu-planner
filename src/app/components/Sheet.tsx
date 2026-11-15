'use client'

import { useEffect, useRef } from 'react'

/** モーダルの題に付ける印（SheetTitle の data-sheet-title）。Sheet は開いたあと、この印の要素に焦点を移す */
export const SHEET_TITLE_ATTR = 'data-sheet-title'
/** 中身がモーダルに収まらないあいだ、Sheet が dialog に付ける印。SheetButtons の上の線は、この印があるときだけ引く */
const SHEET_OVERFLOWING_ATTR = 'data-overflowing'

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
  useEffect(() => {
    const dialog = ref.current
    const content = dialog?.firstElementChild
    if (!dialog || !content || typeof ResizeObserver === 'undefined') return
    // 中身がモーダルに収まらないかを data 属性で示す。下端に残るボタンの並びの上の線は、収まらないときだけ引く（§5）。
    // 大きさの小数の丸めで 1px ずれても線を引かないよう、1px の差は収まっているとみなす。
    // スマホでは、ブラウザのバーが縮むと dvh でモーダルの高さが変わるので、モーダルと中身の両方の大きさを見る
    const mark = () => dialog.toggleAttribute(SHEET_OVERFLOWING_ATTR, dialog.scrollHeight > dialog.clientHeight + 1)
    const observer = new ResizeObserver(mark)
    observer.observe(dialog)
    observer.observe(content)
    return () => observer.disconnect()
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
      className="group m-0 mx-auto mt-auto max-h-[90dvh] scroll-pb-20 w-full max-w-none overflow-y-auto rounded-t-xl bg-white text-ink backdrop:bg-black/50 lg:m-auto lg:max-w-md lg:rounded-xl"
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

/**
 * モーダルの中のボタンの並び。確定を右、やめるをその左に置く（§4）。left は消す操作などで、左下に離して置く。
 * 中身がモーダルに収まらないときも、モーダルの下端に残る（sticky。§5）。左右と下は Sheet の余白（p-4）まで広げて白で塗り、
 * 中身がその下を通っても透けないようにする。上は前の要素との間（space-y-4）を負の余白で詰め、中身が短いときの位置を変えない
 */
export function SheetButtons({ left, children }: { left?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 -mt-2 -mb-4 flex items-center justify-between gap-2 border-t border-transparent bg-white px-4 pt-[7px] pb-4 group-data-overflowing:border-line">
      <div>{left}</div>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

export const FIELD_CLASS = 'min-h-11 w-full rounded-md border border-line bg-white px-2'
/**
 * 日付の欄。iOS の Safari は既定の見た目の date 入力に幅と高さの指定を効かせず、欄が右へはみ出して低くなる。
 * 既定の見た目を外し（appearance-none）、中身の幅で広がらないようにする（min-w-0）。既定の見た目を外すと日付が上に寄るので、
 * 上下の余白で文字の欄と同じ高さの中ほどに置く
 */
export const DATE_FIELD_CLASS = `${FIELD_CLASS} block min-w-0 appearance-none py-[9px]`
/** 選択の欄。iOS の Safari は select の min-height を効かせず 29px ほどになるので、高さを h-11 で決める */
export const SELECT_FIELD_CLASS = `${FIELD_CLASS} h-11`
/** 幅を w-20 などで決める短い欄。FIELD_CLASS の w-full は w-20 より後に出力されて勝つので、幅を含めない */
export const SHORT_FIELD_CLASS = 'min-h-11 shrink-0 rounded-md border border-line bg-white px-2'
/** 幅を w-20 などで決める短い選択の欄（月・日）。SELECT_FIELD_CLASS と同じ理由で h-11 を足す */
export const SHORT_SELECT_FIELD_CLASS = `${SHORT_FIELD_CLASS} h-11`
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
