import { T, leaveTypeRowText } from '@/app/texts'
import type { LeaveTypeRow } from '@/domain/view/settingsView'

const ROW_CLASS = 'flex min-h-11 w-full items-center py-2 text-left'

/** §6 の休暇の種類の節。並びは domain/view の組み立てのまま描く。有休の行は押せない（§5.5） */
export function LeaveTypeSection({
  rows,
  onOpen,
  onAdd,
}: {
  rows: readonly LeaveTypeRow[]
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
          <button key={r.type.id} type="button" onClick={() => onOpen(r.type.id)} className={ROW_CLASS}>
            {leaveTypeRowText(r.type)}
          </button>
        ),
      )}
      <button type="button" onClick={onAdd} className={`${ROW_CLASS} text-primary`}>
        {T.addLeaveType}
      </button>
    </div>
  )
}
