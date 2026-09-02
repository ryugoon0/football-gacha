/**
 * Which build the page came from.
 *
 * The commit alone does not settle it: the same commit can be redeployed, and
 * then two builds are indistinguishable in a screenshot. The build time does
 * settle it, so both are shown together.
 */
export const BUILD_REF = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7)

export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? ''

/** Deploy time in KST, the timezone this is built for. */
export function buildStamp(iso: string = BUILD_TIME): string {
  if (!iso) return ''
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  const kst = new Date(at.getTime() + 9 * 60 * 60_000)
  const pad = (value: number) => `${value}`.padStart(2, '0')
  return (
    `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())} ` +
    `${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())} KST`
  )
}

/** One line naming the build: commit and when it went out. */
export function buildLabel(): string {
  const stamp = buildStamp()
  return stamp ? `${BUILD_REF} · ${stamp}` : BUILD_REF
}
