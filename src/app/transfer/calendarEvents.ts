import { calendarEventTitle } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import { googleCalendarUrl } from '@/domain/transfer/googleCalendar'
import { type CalendarEvent, calendarEntries, calendarUid, isUpcoming } from '@/domain/transfer/ics'
import type { Entry, Settings } from '@/domain/types'

/** F-506・E-3: 日程 1 件をカレンダーの予定にする。題は §6 の決まり */
export function calendarEventOf(entry: Entry, settings: Settings): CalendarEvent {
  const leaveTypeName = settings.leaveTypes.find((t) => t.id === entry.leaveTypeId)?.name ?? ''
  return { uid: calendarUid(entry.id), date: entry.date, summary: calendarEventTitle(entry, leaveTypeName, settings.workMinutes) }
}

/** F-506・E-1: カレンダー用のファイルに入れる予定（これからの予定を、日付の早い順に） */
export function calendarEventsOf(entries: readonly Entry[], settings: Settings, today: IsoDate): readonly CalendarEvent[] {
  return calendarEntries(entries, today).map((e) => calendarEventOf(e, settings))
}

/** F-506・画面定義書 §5.2: 日程のモーダルの「Google カレンダーに追加」の行き先。これからの予定でなければ null（行を出さない） */
export function calendarUrlOf(entry: Entry | undefined, settings: Settings, today: IsoDate): string | null {
  return entry && isUpcoming(entry, today) ? googleCalendarUrl(calendarEventOf(entry, settings)) : null
}
