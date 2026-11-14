import { T, quarterMonths, yearLabel } from '@/app/texts'
import type { Quarter } from '@/domain/quarters/quarters'
import type { IsoDate } from '@/domain/shared/date'

type Props = {
  quarters: readonly Quarter[]
  selected: IsoDate
  onSelect: (start: IsoDate) => void
  canGoBack: boolean
  canGoForward: boolean
  onBack: () => void
  onForward: () => void
}

const EDGE_CLASS = 'min-h-11 shrink-0 px-2 text-sm text-primary'

/** §3.4。スマホだけに出す。2 行のタブ（上に年、下に月）。張り付ける位置は呼ぶ側が決める */
export function QuarterTabs({ quarters, selected, onSelect, canGoBack, canGoForward, onBack, onForward }: Props) {
  return (
    <div className="flex items-stretch border-b border-line">
      {canGoBack && (
        <button type="button" onClick={onBack} className={EDGE_CLASS}>
          {T.back}
        </button>
      )}
      <div role="tablist" aria-label={T.tabsLabel} className="flex min-w-0 flex-1">
        {quarters.map((q) => {
          const on = q.start === selected
          return (
            <button
              key={q.start}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onSelect(q.start)}
              className={`min-h-11 flex-1 border-b-2 py-1 text-center text-sm leading-tight ${on ? 'border-primary font-bold text-primary' : 'border-transparent text-sub'}`}
            >
              <span className="block text-[11px] font-normal">{yearLabel(q.start)}</span>
              {quarterMonths(q.start)}
            </button>
          )
        })}
      </div>
      {canGoForward && (
        <button type="button" onClick={onForward} className={EDGE_CLASS}>
          {T.forward}
        </button>
      )}
    </div>
  )
}
