import { ROW_CLASS, TapRow } from '@/app/components/SettingsRow'
import { T, errorText, leaveTypeRowText } from '@/app/texts'
import type { LeaveTypeRow } from '@/domain/view/settingsView'


/** §6 の休暇の種類の節。並びは domain/view の組み立てのまま描く。有休の行は押せない（§5.5） */
export function LeaveTypeSection({
  rows,
  full,
  onOpen,
  onAdd,
}: {
  rows: readonly LeaveTypeRow[]
  /** D-10: 上限に達している。足すボタンの代わりに理由を出す */
  full: boolean
  onOpen: (id: string) => void
  onAdd: () => void
}) {
  return (
    <div className="space-y-1">
      {rows.map((r) =>
        r.paid ? (
          <div key={r.type.id} className={`${ROW_CLASS} text-sub`}>
            {r.type.name}　{T.cannotRemovePaid}
          </div>
        ) : (
          <TapRow key={r.type.id} onClick={() => onOpen(r.type.id)}>
            <span>{leaveTypeRowText(r.type)}</span>
          </TapRow>
        ),
      )}
      {full ? (
        <p className="text-sm text-sub">{errorText('tooManyLeaveTypes')}</p>
      ) : (
        <button type="button" onClick={onAdd} className={`${ROW_CLASS} text-primary`}>
          {T.addLeaveType}
        </button>
      )}
    </div>
  )
}
