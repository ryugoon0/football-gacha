import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
import { join, parse } from 'path'
import sharp from 'sharp'
import { knockoutBackground } from './knockout.mjs'

/**
 * 선수 초상 — assets/players/<key>.png(생성 원본) → public/players/<key>.webp
 * (256², q80) 와 lib/portraitManifest.ts(있는 키 목록).
 *
 * PNG 원본은 변환 뒤 q95 webp 마스터만 남기고 지운다(비서 이미지와 같은 방식).
 * 카드는 SQUAD_PORTRAITS[name] → key 로 파일을 찾고, 매니페스트에 없으면
 * 지금처럼 SVG 일러스트를 그린다.
 *
 * 실행: npm run build:portraits
 */
const SRC = 'assets/players'
const OUT = 'public/players'
const SIZE = 256

mkdirSync(SRC, { recursive: true })
mkdirSync(OUT, { recursive: true })

const keys = []
for (const file of readdirSync(SRC).sort()) {
  const { name, ext } = parse(file)
  if (!['.png', '.webp'].includes(ext.toLowerCase())) continue
  const src = join(SRC, file)
  const master = join(SRC, `${name}.webp`)
  if (ext.toLowerCase() === '.png') {
    await sharp(src).webp({ quality: 95 }).toFile(master)
    unlinkSync(src)
  }
  // 정방형 상단 크롭: 얼굴이 위쪽 중앙에 오는 3:4 원본 기준.
  const meta = await sharp(master).metadata()
  const w = meta.width ?? SIZE
  const h = meta.height ?? SIZE
  const side = Math.min(w, Math.round(h * 0.75))
  // Crop, shrink, then knock the studio background out so the card's own
  // colour shows behind the head (flood fill from the border, feathered edge).
  const { data, info } = await sharp(master)
    .extract({ left: Math.round((w - side) / 2), top: 0, width: side, height: side })
    .resize({ width: SIZE, height: SIZE })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  knockoutBackground(data, info.width, info.height)
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 80 })
    .toFile(join(OUT, `${name}.webp`))
  keys.push(name)
}

writeFileSync(
  'lib/portraitManifest.ts',
  `// scripts/build-portraits.mjs가 만든다. public/players/<key>.webp 가 있는 키.\nexport const PORTRAIT_KEYS: ReadonlySet<string> = new Set(${JSON.stringify(keys)})\n`,
)
console.log(`초상 ${keys.length}장 → ${OUT}, lib/portraitManifest.ts`)
if (!existsSync(join(OUT, '.gitkeep'))) writeFileSync(join(OUT, '.gitkeep'), '')
