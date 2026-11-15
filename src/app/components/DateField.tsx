import { DATE_FIELD_CLASS } from '@/app/components/Sheet'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>

/**
 * 日付の欄（画面定義書 §5）。右端にカレンダーの印を 1 つ重ねる。iOS・Android の標準の日付の欄は印を出さず、押せる欄だと分かりにくいため。
 * PC の Chrome・Safari の自前の印は globals.css で透明にして欄の全面に広げ、どこを押しても日付の選択が開くようにする。
 * Firefox は自前の印を消せないので、重ねる印を出さない（globals.css）
 */
export function DateField(props: Props) {
  return (
    <span className="date-field relative block">
      <input type="date" {...props} className={`${DATE_FIELD_CLASS} relative pr-10`} />
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="date-field-icon pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-sub"
      >
        <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
        <path d="M3 8.5h14M7 2.5v4M13 2.5v4" strokeLinecap="round" />
      </svg>
    </span>
  )
}
