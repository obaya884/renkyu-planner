import { T, quarterMonths } from '@/app/texts'
import type { SummaryView } from '@/domain/view/summary'

/** §3.3。今日が入る四半期から 4 つ。札は押せない */
export function LongBreakStrip({ summary }: { summary: SummaryView }) {
  return (
    <div>
      <div className="text-sm text-sub">
        {summary.holidaysOnly ? T.longBreak + T.longBreakHolidaysOnly : T.longBreak}
      </div>
      {/* スマホは同じ幅の 4 つを 1 列に並べ、札の中を 2 段にする。PC は札の中を 1 段にして横に並べる */}
      <ul className="mt-1 grid grid-cols-4 gap-1 lg:flex lg:flex-wrap">
        {summary.longBreaks.map(({ quarter, has }) => (
          <li
            key={quarter.start}
            className={`flex flex-col items-center rounded-lg px-1 py-1 text-sm leading-tight lg:flex-row lg:gap-1 lg:rounded-full lg:px-2 lg:py-0.5 ${has ? 'bg-has-bg text-has-ink' : 'bg-warn-bg text-warn-ink'}`}
          >
            <span className="whitespace-nowrap text-xs lg:text-sm">{quarterMonths(quarter.start)}</span>
            <span className="whitespace-nowrap font-bold lg:font-normal">{has ? T.has : T.notYet}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
