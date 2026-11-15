import { HOLIDAY_SOURCE_URL, T, holidayAboutParts } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'

/** §6 の「祝日について」。設定画面のいちばん下。サーバーで描き、最初の HTML に入れる */
export function HolidayAbout({ confirmedUntil }: { confirmedUntil: IsoDate }) {
  const text = holidayAboutParts(confirmedUntil)
  return (
    <section id="holidays" className="space-y-1">
      <h2 className="font-bold">{T.aboutHolidays}</h2>
      <p className="text-sm text-sub">
        {text.before}
        <a href={HOLIDAY_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {text.link}
        </a>
        {text.after}
      </p>
    </section>
  )
}
