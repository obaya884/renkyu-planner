import Link from 'next/link'
import { T, describeCandidateParts, holidayNote, quarterHeading } from '@/app/texts'
import { type CandidateGroup, bestCandidate } from '@/domain/candidates/groupCandidates'
import type { IsoDate } from '@/domain/shared/date'

/** §3.10。文のあとに設定画面の「祝日について」への「くわしく」。最初の HTML と、端末で描く画面の両方のいちばん下に置く */
export function HolidayNote({ confirmedUntil }: { confirmedUntil: IsoDate }) {
  return (
    <p className="text-sm text-sub">
      {holidayNote(confirmedUntil)}
      <Link href="/settings#holidays" className="ml-1 inline-flex min-h-11 items-center text-primary">
        {T.holidayMore}
      </Link>
    </p>
  )
}

/** N-04。最初の HTML に入れる、四半期ごとの見出しと、組ごとに最良の候補 1 件、祝日の 1 行 */
export function StaticCandidates({ groups, confirmedUntil }: { groups: readonly CandidateGroup[]; confirmedUntil: IsoDate }) {
  const quarters = [...new Set(groups.map((g) => g.quarterStart))]
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">{T.staticCandidatesHeading}</h2>
      {quarters.map((q) => (
        <section key={q}>
          <h3 className="font-bold">{quarterHeading(q)}</h3>
          <ul className="mt-1 space-y-1">
            {groups
              .filter((g) => g.quarterStart === q)
              .map((g) => {
                const c = bestCandidate(g)
                const { lead, days, tail } = describeCandidateParts(c)
                return (
                  <li key={g.core}>
                    {lead}
                    <span className={c.long ? 'text-long-ink' : undefined}>{days}</span>
                    {tail}
                    {c.unconfirmed && <span className="ml-2 text-sm text-sub">{T.unconfirmed}</span>}
                  </li>
                )
              })}
          </ul>
        </section>
      ))}
      <HolidayNote confirmedUntil={confirmedUntil} />
    </div>
  )
}
