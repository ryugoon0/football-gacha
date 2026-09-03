'use client'

import WeeklyLeagueMonitorPanel from './WeeklyLeagueMonitorPanel'
import WeeklyLeaguePanel from './WeeklyLeaguePanel'

/** 주간 대회 현황 + 수동 생성(자동 생성이 이미 돌지만 필요할 때 보조로). */
export default function WeeklyLeagueTab() {
  return (
    <div className="space-y-4">
      <WeeklyLeagueMonitorPanel />
      <WeeklyLeaguePanel />
    </div>
  )
}
