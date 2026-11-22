import { CandidateLegend } from '@/app/components/CandidateCard'
import { CandidateList } from '@/app/components/CandidateList'
import { EntryList } from '@/app/components/EntryList'
import { MARK_CLASS, MonthCalendar } from '@/app/components/MonthCalendar'
import { BELOW_SUMMARY_TOP_LG } from '@/app/components/StickySummary'
import { TogetherList } from '@/app/components/TogetherList'
import { T, grantNoteText, longBreakBadgeText, longBreakPeriod, quarterHeading } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import type { DayMark, LongBreakStatus, QuarterView } from '@/domain/view/quarterView'

type Props = {
  view: QuarterView
  workMinutes: number
  onAdd: (leaveDays: readonly IsoDate[]) => void
  onAddTogether: (leaveDays: readonly IsoDate[], leaveTypeId: string) => void
  onOpen: (id: string) => void
  onAddDay: () => void
  onEnterGrant: (grantYearStart: IsoDate) => void
  /** 持ち分の 1 行が画面の上に出ているか。出ているあいだ、PC の見出しはその下に張り付く（§4） */
  belowSummary?: boolean
}

const LEGEND: Readonly<Record<DayMark, string>> = {
  done: T.done,
  planned: T.planned,
  candidate: T.candidates,
  company: T.legendCompany,
  off: T.legendOff,
}
const BADGE_CLASS: Readonly<Record<LongBreakStatus, string>> = {
  has: 'bg-has-bg text-has-ink',
  notYet: 'bg-warn-bg text-warn-ink',
  none: 'bg-none-bg text-none-ink',
}
const LEGEND_ORDER: readonly DayMark[] = ['off', 'company', 'done', 'planned', 'candidate']

/** §3.5・§4。スマホは縦 1 列、PC は左に見出し・カレンダー・日程、右に候補の 2 列 */
export function QuarterSection({ view, workMinutes, onAdd, onAddTogether, onOpen, onAddDay, onEnterGrant, belowSummary = false }: Props) {
  const { quarter, past, longBreak, longBreakStatus, months, marks, grantNote, groups, monthGaps, together, noCandidates, entries } = view
  return (
    <section className="space-y-3">
      <h2 className={`bg-white py-1 text-lg font-bold lg:sticky lg:z-10 ${belowSummary ? BELOW_SUMMARY_TOP_LG : 'lg:top-0'}`}>{quarterHeading(quarter.start)}</h2>
      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        <div className="space-y-3">
          <p className="text-sm">
            {T.longBreak}
            <span className={`ml-2 whitespace-nowrap rounded-full px-2 ${BADGE_CLASS[longBreakStatus]}`}>{longBreakBadgeText(longBreakStatus)}</span>
            {longBreak !== null && ` ${longBreakPeriod(longBreak)}`}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {months.map((m) => (
              <MonthCalendar key={m.month} month={m} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-sub">
            {LEGEND_ORDER.filter((m) => marks.includes(m)).map((m) => (
              <li key={m} className="flex items-center gap-1">
                <span aria-hidden className={`inline-block h-3 w-3 rounded-sm ${MARK_CLASS[m]}`} />
                {LEGEND[m]}
              </li>
            ))}
          </ul>
          {grantNote !== null && (
            <p className="text-sm">
              <span className="mr-1 inline-block h-3 w-3 rounded-sm outline outline-2 outline-long-line" aria-hidden />
              {grantNoteText(grantNote.date, grantNote.entered, grantNote.grantDays)}
              {!grantNote.entered && (
                <button type="button" onClick={() => onEnterGrant(grantNote.date)} className="ml-2 min-h-11 text-primary">
                  {T.enterGrant}
                </button>
              )}
            </p>
          )}
          <EntryList blocks={entries} workMinutes={workMinutes} onOpen={onOpen} onAddDay={onAddDay} />
        </div>
        {!past && (
          <div>
            <h3 className="mb-1.5 font-bold">{T.candidates}</h3>
            {noCandidates ? (
              <p className="text-sm text-sub">{T.noCandidates}</p>
            ) : (
              <div className="space-y-3.5">
                <CandidateLegend />
                <CandidateList groups={groups} monthGaps={monthGaps} workMinutes={workMinutes} onAdd={onAdd} />
                <TogetherList blocks={together} onAdd={onAddTogether} />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
