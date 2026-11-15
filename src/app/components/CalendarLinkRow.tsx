import { Line } from '@/app/components/Sheet'
import { T } from '@/app/texts'

const LINK_CLASS = 'inline-flex min-h-11 items-center underline'

/**
 * §5.1・§5.2: 「Google カレンダーに追加」の行。url を受け取って出すだけ（F-506）。
 * null のときは消さずに、押せない見た目で出す（行の出入りでモーダルの高さを変えない）
 */
export function CalendarLinkRow({ url }: { url: string | null }) {
  return (
    <Line label={T.calendarRowLabel}>
      {url === null ? (
        <a role="link" aria-disabled="true" className={`${LINK_CLASS} text-sub opacity-50`}>
          {T.addToGoogleCalendar}
        </a>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className={`${LINK_CLASS} text-primary`}>
          {T.addToGoogleCalendar}
        </a>
      )}
    </Line>
  )
}
