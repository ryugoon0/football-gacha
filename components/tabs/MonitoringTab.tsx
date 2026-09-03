'use client'

import MonitorPanel from './MonitorPanel'

/** 부정행위 탐지·서버 상태 — 운영자 탭 분산의 일부. */
export default function MonitoringTab() {
  return (
    <div className="space-y-4">
      <MonitorPanel />
    </div>
  )
}
