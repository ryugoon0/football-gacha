import { BODY_MAX, TITLE_MAX } from './board'
import { PATCH_KIND_LABELS, type PatchEntry, type PatchKind } from './patchLog'

/**
 * Turns the patch log entries an operator picked into the announcement players
 * read. Pure, so what the preview shows is exactly what gets posted.
 */

/** Internal work is logged but never written up for players. */
const PLAYER_ORDER: PatchKind[] = ['feature', 'balance', 'fix', 'internal']

export interface PatchNote {
  title: string
  body: string
}

export function defaultNoteTitle(entries: PatchEntry[], now: Date = new Date()): string {
  const date = entries.length > 0 ? entries[0].date : now.toISOString().slice(0, 10)
  return `[패치 노트] ${date}`.slice(0, TITLE_MAX)
}

/**
 * Groups the picked entries by kind and writes them out. Entries keep the
 * order they were given within a group, so the operator's ordering survives.
 */
export function buildPatchNote(entries: PatchEntry[], title?: string): PatchNote {
  const chosen = entries.filter(Boolean)
  const lines: string[] = []

  for (const kind of PLAYER_ORDER) {
    const group = chosen.filter((item) => item.kind === kind)
    if (group.length === 0) continue
    lines.push(`■ ${PATCH_KIND_LABELS[kind]}`)
    for (const item of group) {
      lines.push(`· ${item.title}`)
      for (const detail of item.detail ?? []) lines.push(`   - ${detail}`)
    }
    lines.push('')
  }

  const body = lines.join('\n').trimEnd()
  return {
    title: (title?.trim() || defaultNoteTitle(chosen)).slice(0, TITLE_MAX),
    // The board caps a post; a very long note is trimmed rather than rejected.
    body: body.slice(0, BODY_MAX),
  }
}

export function validateNote(note: PatchNote, picked: number): string | null {
  if (picked === 0) return '공지에 담을 항목을 하나 이상 골라 주세요.'
  if (!note.title.trim()) return '공지 제목을 입력해 주세요.'
  if (!note.body.trim()) return '공지 내용이 비어 있습니다.'
  if (note.body.length > BODY_MAX) return `내용은 ${BODY_MAX}자까지 쓸 수 있습니다.`
  return null
}

/**
 * Ids already covered by a published notice, so the operator can see at a
 * glance what players have and have not been told.
 */
export function publishedIds(notices: { patchIds: string[] }[]): Set<string> {
  const out = new Set<string>()
  for (const notice of notices) for (const id of notice.patchIds) out.add(id)
  return out
}
