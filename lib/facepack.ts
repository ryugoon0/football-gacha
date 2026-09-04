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

/**
 * Clears a flat background: flood-fills from the border, treating pixels close
 * in colour to their background neighbour as background, with a feathered
 * edge. A busy photo simply loses little — nothing breaks. Same algorithm as
 * scripts/knockout.mjs, which prepares the shipped portraits.
 */
function knockoutBackground(data: Uint8ClampedArray, width: number, height: number, tolerance = 24, feather = 14): void {
  const n = width * height
  const visited = new Uint8Array(n)
  const dist = new Float32Array(n)
  const queue = new Int32Array(n)
  let head = 0
  let tail = 0
  const push = (i: number) => {
    visited[i] = 1
    queue[tail++] = i
  }
  // Reference = median colour of the border; every pixel is judged against it.
  const border: number[] = []
  for (let x = 0; x < width; x++) border.push(x, (height - 1) * width + x)
  for (let y = 1; y < height - 1; y++) border.push(y * width, y * width + width - 1)
  const channel = (c: number) => {
    const values = border.map((i) => data[i * 4 + c]).sort((a, b) => a - b)
    return values[Math.floor(values.length / 2)]
  }
  const ref = [channel(0), channel(1), channel(2)]
  // A chroma-key ground (saturated green) is far from any skin or hair, so
  // plain RGB distance with a wide net does it. A grey studio ground is grainy
  // and close in RGB to dark hair, so it is judged on lightness with the extra
  // demand that a background pixel be nearly colourless — hair and skin are not.
  const chroma = Math.max(...ref) - Math.min(...ref)
  const greenKey = ref[1] > 120 && ref[1] - Math.max(ref[0], ref[2]) > 60
  if (greenKey) {
    tolerance = Math.max(tolerance, 70)
    feather = Math.max(feather, 25)
  }
  const refL = (ref[0] + ref[1] + ref[2]) / 3
  const distToRef = (i: number) => {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    if (greenKey || chroma > 24) {
      const dr = r - ref[0]
      const dg = g - ref[1]
      const db = b - ref[2]
      return Math.sqrt(dr * dr + dg * dg + db * db)
    }
    const pixelChroma = Math.max(r, g, b) - Math.min(r, g, b)
    if (pixelChroma > 22) return 999
    return Math.abs((r + g + b) / 3 - refL)
  }
  for (const i of border) {
    const d = distToRef(i)
    if (d <= tolerance + feather && !visited[i]) {
      dist[i] = d
      push(i)
    }
  }
  while (head < tail) {
    const i = queue[head++]
    const x = i % width
    const y = (i - x) / width
    const neighbours = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1]
    for (const j of neighbours) {
      if (j < 0 || visited[j]) continue
      const d = distToRef(j)
      if (d <= tolerance + feather) {
        dist[j] = d
        push(j)
      }
    }
  }
  // Opening (erode, then dilate) on the background mask: thin tendrils that
  // crept into hair highlights or shirt folds vanish, the open ground stays.
  const RADIUS = 2
  const erode = (src: Uint8Array) => {
    const out = new Uint8Array(n)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let keep = 1
        for (let dy = -RADIUS; dy <= RADIUS && keep; dy++) {
          for (let dx = -RADIUS; dx <= RADIUS; dx++) {
            const xx = x + dx
            const yy = y + dy
            // Outside the image counts as background, so the border stays open.
            if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue
            if (!src[yy * width + xx]) {
              keep = 0
              break
            }
          }
        }
        out[y * width + x] = keep
      }
    }
    return out
  }
  const dilate = (src: Uint8Array) => {
    const out = new Uint8Array(n)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let hit = 0
        for (let dy = -RADIUS; dy <= RADIUS && !hit; dy++) {
          for (let dx = -RADIUS; dx <= RADIUS; dx++) {
            const xx = x + dx
            const yy = y + dy
            if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue
            if (src[yy * width + xx]) {
              hit = 1
              break
            }
          }
        }
        out[y * width + x] = hit
      }
    }
    return out
  }
  const opened = dilate(erode(visited))
  for (let i = 0; i < n; i++) {
    if (!opened[i]) continue
    const d = dist[i]
    const alpha = d <= tolerance ? 0 : Math.round((255 * (d - tolerance)) / feather)
    if (alpha < data[i * 4 + 3]) {
      data[i * 4 + 3] = alpha
    }
  }
}

/** Shrinks any image to a 256² square (top-anchored crop) and clears a flat background. */
async function normalise(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, Math.round((bitmap.width - side) / 2), 0, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()
  const image = ctx.getImageData(0, 0, SIZE, SIZE)
  knockoutBackground(image.data, SIZE, SIZE)
  ctx.putImageData(image, 0, 0)
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
