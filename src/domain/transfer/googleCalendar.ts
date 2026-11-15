import { type IsoDate, addDays } from '@/domain/shared/date'
import { toWellFormed } from './eventText'

/** 行き先のホストとパスは固定する（N-05）。題と日付は必ず encodeURIComponent を通す */
const RENDER_URL = 'https://calendar.google.com/calendar/render'

function compactDate(d: IsoDate): string {
  return d.replaceAll('-', '')
}

/**
 * F-506: Google カレンダーの予定作成の URL。終日の予定で、終わりの日は含まない（最後の日の翌日を入れる）。
 * `lastDate` を渡すと、date から lastDate までを 1 件の帯の予定にする（足すとき。画面定義書 §5.1）。題は U+FFFD に置き換えてから渡す（§5.2。encodeURIComponent が例外を投げないように） */
export function googleCalendarUrl(event: Readonly<{ date: IsoDate; lastDate?: IsoDate; summary: string }>): string {
  const start = encodeURIComponent(compactDate(event.date))
  const end = encodeURIComponent(compactDate(addDays(event.lastDate ?? event.date, 1)))
  return `${RENDER_URL}?action=TEMPLATE&text=${encodeURIComponent(toWellFormed(event.summary))}&dates=${start}/${end}`
}
