import { calendarEventTitle } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import { type CalendarEvent, calendarEntries, calendarUid } from '@/domain/transfer/ics'
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
