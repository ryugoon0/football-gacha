'use client'

import { useSyncExternalStore } from 'react'
import { PLAYERS } from './players'
import { SQUAD_PORTRAITS } from './rosterSquads'

/**
 * A player's own facepack — pictures they choose for cards, kept only in this
 * browser (IndexedDB). Football Manager style: the game never uploads, hosts
 * or shares them, so whatever a manager puts here is their own business. The
 * card falls back to the shipped portrait and then the drawn face.
 *
 * Files are matched to cards by file name (without extension), in this order:
 * card id (`lg457`), the card's name (`세네 라멘츠`), or the shipped portrait
 * key (`manred-01`). A template listing all three can be exported for that.
 */
const DB_NAME = 'cs.facepack'
const STORE = 'faces'
const SIZE = 256

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(STORE, mode).objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }),
  )
}

// Object URLs by card id, plus a version counter so cards re-render on change.
const urls = new Map<string, string>()
let loaded = false
let version = 0
const listeners = new Set<() => void>()
const emit = () => {
  version += 1
  for (const listener of listeners) listener()
}

async function loadAll(): Promise<void> {
  if (loaded || typeof window === 'undefined' || !('indexedDB' in window)) return
  loaded = true
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const store = db.transaction(STORE, 'readonly').objectStore(STORE)
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return resolve()
        const blob = cursor.value as Blob
        urls.set(String(cursor.key), URL.createObjectURL(blob))
        cursor.continue()
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    // No storage — the facepack simply stays empty.
  }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  void loadAll()
  return () => {
    listeners.delete(listener)
  }
}
const getVersion = () => version
const getServerVersion = () => 0

/** The facepack image for a card, or null. Re-renders when the pack changes. */
export function useFace(cardId: string): string | null {
  useSyncExternalStore(subscribe, getVersion, getServerVersion)
  return urls.get(cardId) ?? null
}

export function facepackCount(): number {
  return urls.size
}

/** Shrinks any image to a 256² square (top-anchored crop) so storage stays small. */
async function normalise(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, Math.round((bitmap.width - side) / 2), 0, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode'))), 'image/webp', 0.85),
  )
}

/** Resolves a file's stem to a card id, by id, name, or shipped portrait key. */
export function cardIdForStem(stem: string): string | null {
  const key = stem.trim()
  if (!key) return null
  if (PLAYERS.some((p) => p.id === key)) return key
  const byName = PLAYERS.find((p) => p.name === key)
  if (byName) return byName.id
  const nameForPortrait = Object.entries(SQUAD_PORTRAITS).find(([, portraitKey]) => portraitKey === key)?.[0]
  if (nameForPortrait) return PLAYERS.find((p) => p.name === nameForPortrait)?.id ?? null
  return null
}

export interface ImportReport {
  applied: { cardId: string; name: string }[]
  unmatched: string[]
  failed: string[]
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp)$/i

/** Imports loose image files and/or zip archives. Returns what matched and what did not. */
export async function importFacepack(files: File[]): Promise<ImportReport> {
  const report: ImportReport = { applied: [], unmatched: [], failed: [] }
  const entries: { name: string; blob: Blob }[] = []
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(file)
      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir || !IMAGE_EXT.test(path)) continue
        entries.push({ name: path.split('/').pop() ?? path, blob: await entry.async('blob') })
      }
    } else if (IMAGE_EXT.test(file.name)) {
      entries.push({ name: file.name, blob: file })
    }
  }
  await loadAll()
  for (const entry of entries) {
    const stem = entry.name.replace(IMAGE_EXT, '')
    const cardId = cardIdForStem(stem)
    if (!cardId) {
      report.unmatched.push(entry.name)
      continue
    }
    try {
      const blob = await normalise(entry.blob)
      await tx('readwrite', (store) => store.put(blob, cardId))
      const old = urls.get(cardId)
      if (old) URL.revokeObjectURL(old)
      urls.set(cardId, URL.createObjectURL(blob))
      report.applied.push({ cardId, name: PLAYERS.find((p) => p.id === cardId)?.name ?? cardId })
    } catch {
      report.failed.push(entry.name)
    }
  }
  if (report.applied.length) emit()
  return report
}

export async function clearFacepack(): Promise<void> {
  await tx('readwrite', (store) => store.clear())
  for (const url of urls.values()) URL.revokeObjectURL(url)
  urls.clear()
  emit()
}

/** CSV of every card with the three accepted file stems, for naming files. */
export function facepackTemplateCsv(): string {
  const rows = PLAYERS.map((p) => [p.id, p.name, p.club, p.position, SQUAD_PORTRAITS[p.name] ?? ''])
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return ['﻿id,name,club,position,portraitKey', ...rows.map((r) => r.map(escape).join(','))].join('\n')
}
