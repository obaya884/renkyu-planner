import holidays from '@/data/holidays.json'
import { todayInJapan } from '@/domain/shared/date'
import { Header } from './components/Header'
import { StaticCandidates } from './components/StaticCandidates'
import { Planner } from './Planner'
import { staticCandidateGroups } from './staticCandidates'

/** スクリプトが動かないときは、静的な一覧を見せ、持ち分の空けた場所を詰める（画面定義書 §2） */
const NOSCRIPT_CSS = '[data-pending-static]{visibility:visible}[data-pending-slot]{display:none}'

export default function Page() {
  // ビルドした日で組み立てる（N-04）。サーバーの部品なので、ここでの new Date() はビルドのときに 1 回だけ動く
  const groups = staticCandidateGroups(holidays, todayInJapan(new Date()))
  return (
    <>
      <noscript>
        <style>{NOSCRIPT_CSS}</style>
      </noscript>
      <Header />
      <main className="mx-auto max-w-[960px] space-y-4 px-4 py-4">
        <Planner holidays={holidays}>
          <StaticCandidates groups={groups} confirmedUntil={holidays.confirmedUntil} />
        </Planner>
      </main>
    </>
  )
}
