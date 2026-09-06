import { afterEach, describe, expect, it } from 'vitest'
import { CLUBS, PLAYERS } from '../lib/players'
import { applyRenamePack, originalClubOf, originalNameOf, parseRenamePack, renamePackTemplateCsv } from '../lib/renamePack'
import { buildAlbumSets } from '../lib/album'

const first = PLAYERS[0]
const club = first.club

afterEach(() => applyRenamePack({ players: {}, clubs: {} }))

describe('리네임팩', () => {
  it('reads the template, two-column lines and JSON, and ignores names it cannot place', () => {
    const csv = ['type,key,current,new', `player,${first.id},${first.name},새이름`, `club,${club},${club},새클럽`, 'player,nope,x,y', ''].join('\n')
    const fromTemplate = parseRenamePack(csv)
    expect(fromTemplate.pack.players[first.id]).toBe('새이름')
    expect(fromTemplate.pack.clubs[club]).toBe('새클럽')
    expect(fromTemplate.unmatched).toEqual(['nope'])

    const twoCol = parseRenamePack(`${first.id}\t둘째\n${club},셋째\n`)
    expect(twoCol.pack.players[first.id]).toBe('둘째')
    expect(twoCol.pack.clubs[club]).toBe('셋째')

    const json = parseRenamePack(JSON.stringify({ players: { [first.id]: '넷째' }, clubs: { [club]: '다섯째' } }))
    expect(json.players).toBe(1)
    expect(json.clubs).toBe(1)
  })

  it('renames every card of a club together and restores the roster when cleared', () => {
    const mates = PLAYERS.filter((p) => p.club === club).map((p) => p.id)
    applyRenamePack({ players: { [first.id]: '새이름' }, clubs: { [club]: '새클럽' } })
    expect(first.name).toBe('새이름')
    for (const id of mates) expect(PLAYERS.find((p) => p.id === id)!.club).toBe('새클럽')
    expect(CLUBS.find((c) => c.name === '새클럽')).toBeTruthy()
    expect(originalNameOf(first.id)).not.toBe('새이름')
    expect(originalClubOf(first)).toBe(club)

    applyRenamePack({ players: {}, clubs: {} })
    expect(first.name).toBe(originalNameOf(first.id))
    expect(first.club).toBe(club)
    expect(CLUBS.find((c) => c.name === club)).toBeTruthy()
  })

  it('keeps album ids on the original club while the title follows the pack', () => {
    const before = buildAlbumSets().find((set) => set.kind === 'club' && set.id === `club:${club}`)
    if (!before) return // this club has no album (not a real squad); nothing to check
    applyRenamePack({ players: {}, clubs: { [club]: '새클럽' } })
    const after = buildAlbumSets().find((set) => set.id === `club:${club}`)!
    expect(after).toBeTruthy()
    expect(after.title).toBe('새클럽')
    expect(after.playerIds).toEqual(before.playerIds)
  })

  it('writes a template with every club and card and the roster names, not the pack', () => {
    applyRenamePack({ players: { [first.id]: '새이름' }, clubs: {} })
    const csv = renamePackTemplateCsv()
    expect(csv.startsWith('﻿type,key,current,new')).toBe(true)
    expect(csv).toContain(`player,${first.id},${originalNameOf(first.id)},새이름`)
    expect(csv.split('\n').length).toBe(1 + new Set(PLAYERS.map((p) => originalClubOf(p))).size + PLAYERS.length)
  })
})
