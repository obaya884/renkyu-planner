import { CandidateList } from '@/app/components/CandidateList'
import { EntryList } from '@/app/components/EntryList'
import { MARK_CLASS, MonthCalendar } from '@/app/components/MonthCalendar'
import { BELOW_SUMMARY_TOP_LG } from '@/app/components/StickySummary'
import { TogetherList } from '@/app/components/TogetherList'
import { T, grantNoteText, longBreakLine, quarterHeading } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import type { DayMark, QuarterView } from '@/domain/view/quarterView'

type Props = {
  view: QuarterView
  workMinutes: number
  onAdd: (leaveDays: readonly IsoDate[]) => void
  onAddTogether: (leaveDays: readonly IsoDate[], leaveTypeId: string) => void
  onOpen: (id: string) => void
  onMarkDone: (id: string) => void
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
const LEGEND_ORDER: readonly DayMark[] = ['off', 'company', 'done', 'planned', 'candidate']

/** §3.5・§4。スマホは縦 1 列、PC は左に見出し・カレンダー、右に候補と日程の 2 列 */
export function QuarterSection({ view, workMinutes, onAdd, onAddTogether, onOpen, onMarkDone, onAddDay, onEnterGrant, belowSummary = false }: Props) {
  const { quarter, past, longBreak, months, marks, grantNote, candidates, together, noCandidates, entries } = view
  return (
    <section className="space-y-3">
      <h2 className={`bg-white py-1 text-lg font-bold lg:sticky lg:z-10 ${belowSummary ? BELOW_SUMMARY_TOP_LG : 'lg:top-0'}`}>{quarterHeading(quarter.start)}</h2>
      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        <div className="space-y-3">
          <p className="text-sm">
            {longBreakLine(longBreak)}
            {longBreak !== null && <span className="ml-2 rounded-full bg-has-bg px-2 text-has-ink">{T.has}</span>}
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
        </div>
        <div className="space-y-4">
          {!past && (
            <div>
              <h3 className="font-bold">{T.candidates}</h3>
              {noCandidates ? (
                <p className="text-sm text-sub">{T.noCandidates}</p>
              ) : (
                <div className="space-y-3">
                  <TogetherList blocks={together} onAdd={onAddTogether} />
                  <CandidateList blocks={candidates} workMinutes={workMinutes} onAdd={onAdd} />
                </div>
              )}
            </div>
          )}
          <EntryList blocks={entries} workMinutes={workMinutes} onOpen={onOpen} onMarkDone={onMarkDone} onAddDay={onAddDay} />
        </div>
      </div>
    </section>
  )
}
