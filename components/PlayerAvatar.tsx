import { seededRandom } from '../lib/players'
import { PORTRAIT_KEYS } from '../lib/portraitManifest'
import { SQUAD_PORTRAITS } from '../lib/rosterSquads'
import type { PlayerDef } from '../lib/types'

const SKIN = ['#f2c9a0', '#e8b487', '#c98a5b', '#a2673f', '#7b4a2c']
const HAIR = ['#161213', '#2f2119', '#5a3921', '#8c5a2b', '#d8ce9a', '#8f2f2f']
const KIT = ['#d92e3a', '#1f5fd6', '#16a34a', '#f5c518', '#111827', '#7c3aed', '#ea580c']

function hash(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * A portrait built from the player id, so every card in the roster has its own
 * face without shipping a single image.
 */
export default function PlayerAvatar({
  player,
  className = '',
}: {
  player: PlayerDef
  className?: string
}) {
  // A generated portrait when one exists for this card; the drawn face otherwise.
  const portraitKey = SQUAD_PORTRAITS[player.name]
  if (portraitKey && PORTRAIT_KEYS.has(portraitKey)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/players/${portraitKey}.webp`}
        alt={`${player.name} 초상`}
        loading="lazy"
        className={`aspect-[100/116] w-full object-cover object-top ${className}`}
      />
    )
  }

  const rng = seededRandom(hash(player.id + player.name))
  const skin = SKIN[Math.floor(rng() * SKIN.length)]
  const hair = HAIR[Math.floor(rng() * HAIR.length)]
  const kit = KIT[Math.floor(rng() * KIT.length)]
  const hairStyle = Math.floor(rng() * 4)
  const beard = rng() < 0.35
  const brow = rng() < 0.5 ? -1 : 1

  return (
    <svg
      viewBox="0 0 100 116"
      className={className}
      role="img"
      aria-label={`${player.name} 일러스트`}
    >
      {/* shoulders */}
      <path d="M12 116c0-22 16-32 38-32s38 10 38 32z" fill={kit} />
      <path d="M42 84h16l-8 12z" fill="#ffffff" opacity="0.85" />
      <rect x="43" y="66" width="14" height="20" rx="6" fill={skin} />

      {/* head */}
      <ellipse cx="50" cy="48" rx="23" ry="26" fill={skin} />
      <ellipse cx="27" cy="50" rx="4" ry="6" fill={skin} />
      <ellipse cx="73" cy="50" rx="4" ry="6" fill={skin} />

      {/* hair */}
      {hairStyle === 0 && <path d="M27 44c0-16 10-24 23-24s23 8 23 24c-6-8-14-11-23-11s-17 3-23 11z" fill={hair} />}
      {hairStyle === 1 && <path d="M26 46c-1-19 11-27 24-27s25 8 24 27c-3-4-4-10-6-13-6 5-30 6-36 1-2 3-4 8-6 12z" fill={hair} />}
      {hairStyle === 2 && <path d="M28 40c4-14 12-20 22-20s18 6 22 20c-4-3-9-4-13-2-4-4-14-4-18-1-4-2-9-1-13 3z" fill={hair} />}
      {hairStyle === 3 && (
        <>
          <path d="M28 42c2-15 11-22 22-22s20 7 22 22c-7-6-14-8-22-8s-15 2-22 8z" fill={hair} />
          <path d="M50 20c8 0 15 5 18 13l4-2c-3-11-11-17-22-17s-19 6-22 17l4 2c3-8 10-13 18-13z" fill={hair} opacity="0.7" />
        </>
      )}

      {/* face */}
      <ellipse cx="41" cy="50" rx="2.6" ry="3.2" fill="#1f2937" />
      <ellipse cx="59" cy="50" rx="2.6" ry="3.2" fill="#1f2937" />
      <path d={`M35 ${43 + brow} q6 -3 12 0`} stroke={hair} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d={`M53 ${43 + brow} q6 -3 12 0`} stroke={hair} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M50 54 l-3 6 h6z" fill="#00000018" />
      <path d="M43 65 q7 5 14 0" stroke="#8a4a3a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {beard && (
        <path
          d="M31 52c1 14 9 22 19 22s18-8 19-22c-3 12-10 17-19 17s-16-5-19-17z"
          fill={hair}
          opacity="0.75"
        />
      )}
    </svg>
  )
}
