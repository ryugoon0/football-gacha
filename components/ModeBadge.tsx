/**
 * The one-line reminder of which of the two match modes a tab belongs to —
 * casual (자기 판단으로 버튼을 눌러 진행하는 기존 디비전 리그) versus
 * competitive (실유저끼리 붙는 주간 대회). Same component so the two read
 * as one deliberate pair rather than two screens that happened to get a
 * badge each.
 */
const STYLES = {
  casual: { tone: 'bg-sky-400/15 text-sky-300', dim: 'text-sky-300/70' },
  competitive: { tone: 'bg-amber-400/15 text-amber-300', dim: 'text-amber-300/70' },
} as const

export default function ModeBadge({ mode = 'competitive' as const }: { mode?: keyof typeof STYLES }) {
  const label = mode === 'casual' ? '캐주얼 모드' : '경쟁 리그'
  const hint =
    mode === 'casual' ? '직접 경기 시작을 눌러야 진행됩니다' : '실유저와 겨루는 주간 대회입니다'
  const style = STYLES[mode]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${style.tone}`}>
      {label}
      <span className={`font-normal ${style.dim}`}>— {hint}</span>
    </span>
  )
}
