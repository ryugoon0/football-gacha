import { passAccuracy, possessionShare, ppda, type MatchMetrics } from './metrics'
import type { TacticalState } from './state'

export interface MatchReport {
  possession: number
  passAccuracy: number
  ppda: number
  shots: number
  shotsAgainst: number
  xg: number
  xgAgainst: number
  highTurnovers: number
  counterAttacks: number
  crosses: number
  throughBalls: number
  finalThirdEntries: number
  /** Plain sentences explaining how the match came to look like that. */
  story: string[]
}

const pct = (value: number) => Math.round(value * 100)

/**
 * Turns the match metrics into the sentences a manager would use. Nothing here
 * changes the result — it reads what the simulation already produced, so the
 * player can see why a plan worked or did not.
 */
export function buildReport(
  metrics: MatchMetrics,
  ours: TacticalState,
  theirs: TacticalState,
): MatchReport {
  const us = metrics.home
  const them = metrics.away
  const possession = possessionShare(metrics, 'home')
  const story: string[] = []

  // 1. Who had the ball, and whether it was worth having.
  if (possession >= 0.58) {
    const sterile = us.finalThirdEntries / Math.max(1, us.passes) < 0.06
    story.push(
      sterile
        ? `점유율 ${pct(possession)}%로 공을 오래 잡았지만 상대 블록을 열지 못해 마지막 3분의 1 진입이 ${us.finalThirdEntries}회에 그쳤습니다.`
        : `점유율 ${pct(possession)}%로 경기를 지배하며 마지막 3분의 1에 ${us.finalThirdEntries}회 진입했습니다.`,
    )
  } else if (possession <= 0.42) {
    story.push(
      `점유율은 ${pct(possession)}%에 불과했지만, 내주기로 한 공이었습니다. 상대의 마지막 3분의 1 진입은 ${them.finalThirdEntries}회였습니다.`,
    )
  }

  // 2. Pressing: where the ball was won.
  const ourPpda = ppda(metrics, 'home')
  if (us.highTurnovers >= 10) {
    story.push(
      `전방 압박이 걸려 상대 진영에서 ${us.highTurnovers}차례 공을 끊었습니다(PPDA ${ourPpda.toFixed(1)}).`,
    )
  } else if (us.highTurnovers <= 4 && ours.pressPower < 0.35) {
    story.push(`앞에서 쫓지 않고 블록을 지켰기 때문에 높은 위치 탈취는 ${us.highTurnovers}회에 머물렀습니다.`)
  }

  // 3. Build-up under pressure.
  const accuracy = passAccuracy(us)
  if (accuracy < 0.7) {
    story.push(
      theirs.pressPower > 0.55
        ? `상대의 강한 압박에 눌려 패스 성공률이 ${pct(accuracy)}%까지 떨어졌습니다.`
        : `길게 넘기는 선택이 많아 패스 성공률은 ${pct(accuracy)}%에 그쳤습니다.`,
    )
  } else if (accuracy > 0.82 && ours.buildUpControl > 0.5) {
    story.push(`후방에서 침착하게 풀어내 패스 성공률 ${pct(accuracy)}%를 지켰습니다.`)
  }

  // 4. Where the chances came from.
  if (us.throughBalls >= Math.max(3, us.crosses)) {
    story.push(
      `상대 수비라인 뒤 공간을 노린 침투 패스가 ${us.throughBalls}회로, 기회의 주된 통로였습니다.`,
    )
  } else if (us.crosses >= Math.max(4, us.throughBalls * 2)) {
    story.push(`측면을 벌려 ${us.crosses}회 크로스를 올렸습니다.`)
  }
  if (us.counterAttacks >= 3) {
    story.push(`빼앗은 직후 곧바로 나간 역습이 ${us.counterAttacks}회 슈팅으로 이어졌습니다.`)
  }

  // 5. What it cost.
  if (them.counterAttacks >= 3) {
    story.push(
      ours.restDefence < 0.35
        ? `공격에 인원을 많이 올린 대가로 역습을 ${them.counterAttacks}차례 허용했습니다.`
        : `상대에게도 역습 기회가 ${them.counterAttacks}차례 있었습니다.`,
    )
  }
  if (ours.spaceBehind > 0.55 && them.throughBalls >= 3) {
    story.push(`높은 수비라인 뒤로 ${them.throughBalls}번 공이 넘어가 위험한 장면이 나왔습니다.`)
  }
  if (us.staminaUsed > 420) {
    story.push('압박과 템포를 끝까지 유지하느라 체력 소모가 컸습니다. 후반에는 압박이 느슨해졌습니다.')
  }

  return {
    possession,
    passAccuracy: accuracy,
    ppda: ourPpda,
    shots: us.shots,
    shotsAgainst: them.shots,
    xg: us.xg,
    xgAgainst: them.xg,
    highTurnovers: us.highTurnovers,
    counterAttacks: us.counterAttacks,
    crosses: us.crosses,
    throughBalls: us.throughBalls,
    finalThirdEntries: us.finalThirdEntries,
    story,
  }
}
