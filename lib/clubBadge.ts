import { hashString } from './random'

/**
 * A club's round badge without any artwork: one or two characters and a
 * colour. The initials come from the club name's words (울산 호랑 → 울호,
 * 맨체스 레즈 → 맨레), so two clubs sharing a city still differ. The colour is
 * drawn from the name, stable across builds, and kept saturated but dark
 * enough for white lettering.
 */
export function clubInitials(club: string): string {
  const words = club.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`
  return club.slice(0, 2)
}

const PALETTE = [
  '#b91c1c', // red
  '#1d4ed8', // blue
  '#047857', // green
  '#6d28d9', // violet
  '#b45309', // amber
  '#0e7490', // cyan
  '#be185d', // pink
  '#374151', // slate
  '#7c2d12', // brown
  '#0f766e', // teal
  '#4338ca', // indigo
  '#a16207', // gold
]

export function clubColor(club: string): string {
  return PALETTE[hashString(`club:${club}`) % PALETTE.length]
}
