import type { ReactNode } from 'react'
import { T, runDaysText, stripCell } from '@/app/texts'
import type { Strip, StripKind } from '@/domain/view/quarterView'

/** 試作（D 案）: 候補の欄の共通の部品。枠つきのカード、見出しの帯、日の並びの行、カードの下の開く行、凡例 */

const KIND_CLASS: Readonly<Record<StripKind, string>> = {
  take: 'border-dashed border-candidate-line bg-candidate-bg font-bold text-ink',
  off: 'bg-rest-bg text-rest-ink',
  company: 'bg-company-bg text-company-ink',
  done: 'bg-primary font-bold text-white',
  planned: 'border-primary font-bold',
}
const BORDERED: ReadonlySet<StripKind> = new Set(['take', 'planned'])

const SIZE = {
  normal: { strip: 'gap-0.5', cell: 'w-[26px] flex-none text-[13px]', border: 'border-2 pt-0 pb-px', plain: 'pt-0.5 pb-[3px]', weekday: 'text-[10px]' },
  small: { strip: 'flex-wrap gap-px', cell: 'min-w-[14px] max-w-[19px] flex-1 text-[10px]', border: 'border-[1.5px] pt-0 pb-px', plain: 'pt-0.5 pb-[3px]', weekday: 'text-[8px]' },
} as const

export function DayStrip({ strip }: { strip: Strip }) {
  const size = SIZE[strip.size]
  return (
    <div className={`mt-1.5 flex items-end ${size.strip}`} data-strip={strip.size}>
      {strip.days.map(({ date, kind }) => {
        const { weekday, day } = stripCell(date)
        return (
          <div
            key={date}
            data-kind={kind}
            className={`rounded text-center leading-[1.15] ${size.cell} ${BORDERED.has(kind) ? size.border : size.plain} ${KIND_CLASS[kind]}`}
          >
            <i className={`block not-italic opacity-75 ${size.weekday}`}>{weekday}</i>
            {day}
          </div>
        )
      })}
    </div>
  )
}

export function Card({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <h4 className="bg-card px-3 py-2 text-[13px] font-bold text-gray-700">{heading}</h4>
      {children}
    </div>
  )
}

type RowProps = {
  take: string
  runDays: number
  long: boolean
  strip: Strip
  notes: readonly string[]
  warn?: string | null
  onAdd: () => void
}

/** 上の行に「〜を休む」と「4連休」、その下に日の並びと補足、右に「入れる」 */
export function StripRow({ take, runDays, long, strip, notes, warn = null, onAdd }: RowProps) {
  return (
    <li className="flex items-center gap-2 border-t border-line px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span>{take}</span>
          <b className={`whitespace-nowrap text-[15px] ${long ? 'text-long-ink' : ''}`}>{runDaysText(runDays)}</b>
        </div>
        <DayStrip strip={strip} />
        {(notes.length > 0 || warn !== null) && (
          <div className="mt-1 text-xs text-sub">
            {notes.join('・')}
            {warn !== null && <span className={`font-bold text-warn-ink ${notes.length > 0 ? 'ml-2' : ''}`}>{warn}</span>}
          </div>
        )}
      </div>
      <button type="button" onClick={onAdd} className="min-h-11 shrink-0 pl-1 text-sm font-bold text-primary">
        {T.insert}
      </button>
    </li>
  )
}

/** カードのいちばん下の開く行。標準の <details> で開閉する（状態は持たない） */
export function MoreRow({ summary, tag = null, children }: { summary: string; tag?: string | null; children: ReactNode }) {
  return (
    <details className="group border-t border-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-[13px] text-primary [&::-webkit-details-marker]:hidden">
        <span>
          {summary}
          {tag !== null && <span className="ml-1.5 rounded bg-long-bg px-1.5 align-[1px] text-xs text-long-ink">{tag}</span>}
        </span>
        <span aria-hidden className="transition-transform group-open:rotate-180">
          {T.more}
        </span>
      </summary>
      <ul>{children}</ul>
    </details>
  )
}

const LEGEND_SWATCH = 'mr-1 inline-block h-2.5 w-2.5 rounded-[2px] align-[-1px]'

export function CandidateLegend() {
  return (
    <div className="flex gap-3 text-[11px] text-sub">
      <span>
        <span aria-hidden className={`${LEGEND_SWATCH} border-[1.5px] border-dashed border-candidate-line bg-candidate-bg`} />
        {T.restDays}
      </span>
      <span>
        <span aria-hidden className={`${LEGEND_SWATCH} bg-rest-bg`} />
        {T.legendOff}
      </span>
      <span>
        <span aria-hidden className={`${LEGEND_SWATCH} bg-company-bg`} />
        {T.legendCompany}
      </span>
    </div>
  )
}
