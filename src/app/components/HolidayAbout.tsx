import { T, holidayAboutText } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'

/** §6 の「祝日について」。設定画面のいちばん下。サーバーで描き、最初の HTML に入れる */
export function HolidayAbout({ confirmedUntil, updatedAt }: { confirmedUntil: IsoDate; updatedAt: IsoDate }) {
  return (
    <section id="holidays" className="space-y-1">
      <h2 className="font-bold">{T.aboutHolidays}</h2>
      <p className="text-sm text-sub">{holidayAboutText(confirmedUntil, updatedAt)}</p>
    </section>
  )
}
