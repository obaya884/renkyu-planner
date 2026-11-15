import { type IsoDate, addDays } from '@/domain/shared/date'

/** 行き先のホストとパスは固定する（N-05）。題と日付は必ず encodeURIComponent を通す */
const RENDER_URL = 'https://calendar.google.com/calendar/render'

function compactDate(d: IsoDate): string {
  return d.replaceAll('-', '')
}

/** F-506: Google カレンダーの予定作成の URL。終日の予定で、終わりの日は含まない（翌日を入れる） */
export function googleCalendarUrl(event: Readonly<{ date: IsoDate; summary: string }>): string {
  const start = encodeURIComponent(compactDate(event.date))
  const end = encodeURIComponent(compactDate(addDays(event.date, 1)))
  return `${RENDER_URL}?action=TEMPLATE&text=${encodeURIComponent(event.summary)}&dates=${start}/${end}`
}
