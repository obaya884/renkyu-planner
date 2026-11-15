import type { CSSProperties, ReactNode } from 'react'
import { T, insertLabel, joinNotes, runDaysText, stripCell, stripLabel, takeText } from '@/app/texts'
import type { Run } from '@/domain/calendar/restDays'
import type { Strip, StripKind } from '@/domain/view/quarterView'

/** §3.7 の候補の欄の部品。枠つきのカード、見出しの帯、日の並びの行、カードの下の開く行、凡例 */

/** §3.6 の色分けと同じ（§7）。休む日と予定は枠、取得済みは塗り、休みの日は薄い地 */
const KIND_CLASS: Readonly<Record<StripKind, string>> = {
  take: 'border-dashed border-candidate-line bg-candidate-bg font-bold text-ink',
  done: 'bg-primary font-bold text-white',
  planned: 'border-primary font-bold',
  company: 'bg-company-bg text-company-ink',
  off: 'bg-rest-bg text-rest-ink',
}
const BORDERED: ReadonlySet<StripKind> = new Set(['take', 'planned'])

/**
 * §3.7 の寸法。マスの幅は、並びが行の幅（100cqw）に収まる幅をマスの数（--days）とマスのあいだから求め、上限で抑える。
 * normal は 26px を上限に縮め、折り返さない。
 * small は 19px を上限に、14px を下限に縮め、収まらなければ折り返す。幅はマスの数だけで決まるので、折り返した段のマスも 1 段目と同じ幅になる
 */
const SIZE = {
  normal: { strip: 'gap-0.5', cell: 'w-[min(26px,calc((100cqw_-_(var(--days)_-_1)_*_2px)_/_var(--days)))] flex-none text-[13px]', border: 'border-2 pt-0 pb-px', plain: 'pt-0.5 pb-[3px]', weekday: 'text-[10px]' },
  small: {
    strip: 'flex-wrap gap-px',
    cell: 'w-[clamp(14px,calc((100cqw_-_(var(--days)_-_1)_*_1px)_/_var(--days)),19px)] flex-none text-[10px]',
    border: 'border-[1.5px] pt-0 pb-px',
    plain: 'pt-0.5 pb-[3px]',
    weekday: 'text-[8px]',
  },
} as const

/** 読み上げは label の 1 つにまとめ、マスは読み上げから外す */
export function DayStrip({ strip, label }: { strip: Strip; label: string }) {
  const size = SIZE[strip.size]
  return (
    <div role="img" aria-label={label} className="@container mt-1.5">
      <div aria-hidden className={`flex items-end ${size.strip}`} data-strip={strip.size} style={{ '--days': strip.days.length } as CSSProperties}>
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
    </div>
  )
}

export function Card({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <h4 className="bg-card px-3 py-2 text-[13px] font-bold text-card-head-ink">{heading}</h4>
      {children}
    </div>
  )
}

type RowProps = {
  /** 休む日の文（candidateDays か togetherDays） */
  days: string
  run: Run
  long: boolean
  strip: Strip
  notes: readonly string[]
  warn?: string | null
  onAdd: () => void
}

/** §3.7 の候補 1 件。上の行に「〜を休む」と「4連休」、その下に日の並びと補足、右に「入れる」 */
export function StripRow({ days, run, long, strip, notes, warn = null, onAdd }: RowProps) {
  return (
    <li className="flex items-center gap-2 border-t border-line px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span>{takeText(days)}</span>
          <b className={`whitespace-nowrap text-[15px] ${long ? 'text-long-ink' : ''}`}>
            {runDaysText(run.days)}
          </b>
        </div>
        <DayStrip strip={strip} label={stripLabel(run, days)} />
        {(notes.length > 0 || warn !== null) && (
          <div className="mt-1 text-xs text-sub">
            {joinNotes(notes)}
            {warn !== null && <span className={`font-bold text-warn-ink ${notes.length > 0 ? 'ml-2' : ''}`}>{warn}</span>}
          </div>
        )}
      </div>
      <button type="button" onClick={onAdd} aria-label={insertLabel(days, run.days)} className="min-h-11 shrink-0 pl-1 text-sm font-bold text-primary">
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

/** §3.7 の凡例。日の並びの色の見本 */
export function CandidateLegend() {
  return (
    <div className="flex gap-3 text-[11px] text-sub" data-legend="candidates">
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
