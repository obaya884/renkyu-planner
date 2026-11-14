import { type IsoDate, quarterStart } from '@/domain/shared/date'
import type { Candidate } from './findCandidates'

export type CandidateGroup = Readonly<{ core: IsoDate; quarterStart: IsoDate; candidates: readonly Candidate[] }>

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** 効率（並びの日数 ÷ 休む日数）の比較。大きいほうが負。分数のまま比べて誤差を避ける */
function byEfficiencyDesc(a: Candidate, b: Candidate): number {
  return b.run.days * a.leaveDays.length - a.run.days * b.leaveDays.length
}

/** 組の中で最も効率のよい候補。同じなら休む日数の少ないもの、さらに同じなら休む最初の日が早いもの（R-6） */
export function bestCandidate(group: Pick<CandidateGroup, 'candidates'>): Candidate {
  return [...group.candidates].sort(
    (a, b) => byEfficiencyDesc(a, b) || a.leaveDays.length - b.leaveDays.length || cmp(a.leaveDays[0], b.leaveDays[0]),
  )[0]
}

/** R-5〜R-7: 核でまとめ、四半期の早い順に並べ、四半期の中は組の最良効率の大きい順 */
export function groupCandidates(cands: readonly Candidate[]): CandidateGroup[] {
  const byCore = new Map<IsoDate, Candidate[]>()
  for (const c of cands) byCore.set(c.core, [...(byCore.get(c.core) ?? []), c])

  const groups = [...byCore].map(([core, list]) => {
    const best = bestCandidate({ candidates: list })
    const candidates = [...list].sort(
      (a, b) => a.leaveDays.length - b.leaveDays.length || b.run.days - a.run.days || cmp(a.leaveDays[0], b.leaveDays[0]),
    )
    return { group: { core, quarterStart: quarterStart(best.leaveDays[0]), candidates } as CandidateGroup, best }
  })

  return groups
    .sort((a, b) => cmp(a.group.quarterStart, b.group.quarterStart) || byEfficiencyDesc(a.best, b.best) || cmp(a.group.core, b.group.core))
    .map((g) => g.group)
}
