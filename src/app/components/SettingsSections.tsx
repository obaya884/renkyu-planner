import { CompanyHolidaySection } from '@/app/components/CompanyHolidaySection'
import { GrantSection } from '@/app/components/GrantSection'
import { LeaveTypeSection } from '@/app/components/LeaveTypeSection'
import { WeekStartRow } from '@/app/components/WeekStartRow'
import { WorkMinutesRow } from '@/app/components/WorkMinutesRow'
import { T } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import type { WeekStart } from '@/domain/types'
import type { CompanyHolidayRow, GrantSectionView, LeaveTypeRow } from '@/domain/view/settingsView'

type Props = {
  grantView: GrantSectionView | null
  workMinutes: number
  weekStart: WeekStart
  companyHolidayRows: readonly CompanyHolidayRow[]
  leaveTypeRows: readonly LeaveTypeRow[]
  onOpenGrant: (grantYearStart: IsoDate) => void
  onFirstGrant: () => void
  onChangeGrantDay: () => void
  onChangeWorkMinutes: (minutes: number) => void
  onChangeWeekStart: (weekStart: WeekStart) => void
  onOpenCompanyHoliday: (index: number) => void
  onAddCompanyHoliday: () => void
  onOpenLeaveType: (id: string) => void
  onAddLeaveType: () => void
}

/** §6: 設定画面の節を上から並べる（有休、1 日の所定労働時間、カレンダー、会社の休日、休暇の種類）。「祝日について」はページの側が下に置く */
export function SettingsSections(p: Props) {
  return (
    <>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-sub">{T.paidSection}</h2>
        <GrantSection view={p.grantView} workMinutes={p.workMinutes} onOpen={p.onOpenGrant} onFirst={p.onFirstGrant} onChangeDay={p.onChangeGrantDay} />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-sub">{T.workMinutesLabel}</h2>
        <WorkMinutesRow workMinutes={p.workMinutes} onChange={p.onChangeWorkMinutes} />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-sub">{T.calendarLabel}</h2>
        <WeekStartRow weekStart={p.weekStart} onChange={p.onChangeWeekStart} />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-sub">{T.companyHolidaySection}</h2>
        <p className="text-sm text-sub">{T.companyHolidayHint}</p>
        <CompanyHolidaySection rows={p.companyHolidayRows} onOpen={p.onOpenCompanyHoliday} onAdd={p.onAddCompanyHoliday} />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-sub">{T.leaveTypeSection}</h2>
        <p className="text-sm text-sub">{T.leaveTypeHint}</p>
        <LeaveTypeSection rows={p.leaveTypeRows} onOpen={p.onOpenLeaveType} onAdd={p.onAddLeaveType} />
      </section>
    </>
  )
}
