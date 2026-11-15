import { ROW_CLASS, TapRow } from '@/app/components/SettingsRow'
import { T, grantDayText, grantYearPeriod, grantYearRowText } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import type { GrantSectionView, GrantYearRow } from '@/domain/view/settingsView'


function RowBody({ row, isNext, workMinutes }: { row: GrantYearRow; isNext: boolean; workMinutes: number }) {
  return (
    <>
      <span>{grantYearPeriod(row.start, row.end)}</span>
      <span className="text-sub">{grantYearRowText(row, isNext, workMinutes)}</span>
    </>
  )
}

/** §6 の有休の節。付与年の行の文は texts.ts、並びは domain/view の組み立てのまま描く */
export function GrantSection({
  view,
  workMinutes,
  onOpen,
  onFirst,
  onChangeDay,
}: {
  view: GrantSectionView | null
  workMinutes: number
  onOpen: (grantYearStart: IsoDate) => void
  onFirst: () => void
  onChangeDay: () => void
}) {
  if (view === null) {
    return (
      <div className="space-y-1">
        <TapRow onClick={onFirst}>
          <span>{T.grantDayRowLabel}</span>
          <span className="text-sub">{T.grantDayUnset}</span>
        </TapRow>
      </div>
    )
  }
  return (
    <div className="space-y-1">
      <TapRow onClick={onChangeDay}>
        <span>{T.grantDayRowLabel}</span>
        <span>{grantDayText(view.grantDay)}</span>
      </TapRow>
      {[view.current, view.next].map((row, i) => (
        <TapRow key={row.start} onClick={() => onOpen(row.start)}>
          <RowBody row={row} isNext={i === 1} workMinutes={workMinutes} />
        </TapRow>
      ))}
      {view.past.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2">{T.viewPastGrantYears}</summary>
          {view.past.map((row) => (
            <div key={row.start} className={ROW_CLASS}>
              <RowBody row={row} isNext={false} workMinutes={workMinutes} />
            </div>
          ))}
        </details>
      )}
    </div>
  )
}
