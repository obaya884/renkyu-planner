import holidays from '@/data/holidays.json'
import { bestCandidate } from '@/domain/candidates/groupCandidates'
import { todayInJapan } from '@/domain/shared/date'
import { APP_DESCRIPTION, APP_NAME } from './site'
import {
  describeCandidate,
  formatJapaneseDate,
  quarterHeading,
  staticCandidateGroups,
} from './staticCandidates'

export default function Page() {
  const groups = staticCandidateGroups(holidays, todayInJapan(new Date()))
  const quarters = [...new Set(groups.map((g) => g.quarterStart))]
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">{APP_NAME}</h1>
      <p>{APP_DESCRIPTION}</p>
      <h2 className="mt-4 text-xl font-bold">連休の候補</h2>
      {quarters.map((q) => (
        <section key={q}>
          <h3 className="mt-2 font-bold">{quarterHeading(q)}</h3>
          <ul>
            {groups
              .filter((g) => g.quarterStart === q)
              .map((g) => {
                const c = bestCandidate(g)
                return (
                  <li key={g.core}>
                    {describeCandidate(c)}
                    {c.long && <span>長め</span>}
                    {c.unconfirmed && <span>祝日が未確定</span>}
                  </li>
                )
              })}
          </ul>
        </section>
      ))}
      <p className="mt-4">{`祝日は内閣府の公表データ。${formatJapaneseDate(holidays.confirmedUntil)}まで確定`}</p>
    </main>
  )
}
