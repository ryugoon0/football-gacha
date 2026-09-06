/**
 * One key per real person behind the cards.
 *
 * The same footballer can exist as several cards — a current squad card, a
 * 월드 season card at a past club, a 리미티드 week card — with different ids.
 * A team sheet may field a person once, whichever card it is, so every card
 * carries `person`: a short FNV-1a hash of the real name the roster build knows
 * (scripts/build-squad-cards.mjs computes it with this exact algorithm, so the
 * name itself never ships — only the hash does). Cards without a known person
 * fall back to their own id.
 */
export function personKey(realName: string): string {
  let hash = 0x811c9dc5
  const text = realName.normalize('NFC').trim()
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return 'p' + hash.toString(16).padStart(8, '0')
}
