import { mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'fs'
import { join, parse } from 'path'
import sharp from 'sharp'

/**
 * AI 비서 캐릭터 이미지를 게임용으로 만든다.
 *
 * 원본(assets/assistants/<mode>/<name>.png 또는 .webp)에서 두 가지를 낸다:
 * - assets/assistants/<mode>/<name>.webp — 거의 무손실(q95) 마스터. 저장소에는
 *   이걸 남기고 PNG(장당 2MB)는 지운다 — 원본 화질은 그대로, 용량은 1/5.
 * - public/assistants/<mode>/<name>.webp — 게임이 실제로 내려받는 파일. 세로
 *   1024로 맞추고 q82. 상반신 크롭(<name>-bust.webp)도 같이 만든다 — 홈
 *   카드·토스트처럼 작은 자리에 쓴다.
 *
 * mode는 safe(건전) / open(노출) 두 가지. 실행: npm run build:assistants
 */
const SRC_ROOT = 'assets/assistants'
const OUT_ROOT = 'public/assistants'
const MODES = ['safe', 'open']

/** 상반신 크롭: 3:4 원본의 위쪽 60%를 1:1로 — 얼굴이 카드 중앙 위쪽에 온다. */
const BUST_TOP_RATIO = 0.6

let made = 0
for (const mode of MODES) {
  const srcDir = join(SRC_ROOT, mode)
  if (!existsSync(srcDir)) continue
  const outDir = join(OUT_ROOT, mode)
  mkdirSync(outDir, { recursive: true })

  for (const file of readdirSync(srcDir)) {
    const { name, ext } = parse(file)
    if (!['.png', '.webp'].includes(ext.toLowerCase())) continue
    const srcPath = join(srcDir, file)
    if (!statSync(srcPath).isFile()) continue

    const image = sharp(srcPath)
    const meta = await image.metadata()
    const width = meta.width ?? 0
    const height = meta.height ?? 0

    // 1) 마스터 webp — PNG 원본이면 변환 뒤 PNG는 지운다.
    const masterPath = join(srcDir, `${name}.webp`)
    if (ext.toLowerCase() === '.png') {
      await sharp(srcPath).webp({ quality: 95 }).toFile(masterPath)
      unlinkSync(srcPath)
    }

    // 2) 게임용 전체 컷
    await sharp(masterPath)
      .resize({ height: 1024, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(join(outDir, `${name}.webp`))

    // 3) 상반신 정방형 크롭
    const cropHeight = Math.round(height * BUST_TOP_RATIO)
    const side = Math.min(width, cropHeight)
    const left = Math.round((width - side) / 2)
    await sharp(masterPath)
      .extract({ left, top: 0, width: side, height: side })
      .resize({ width: 512, height: 512 })
      .webp({ quality: 82 })
      .toFile(join(outDir, `${name}-bust.webp`))

    made += 1
    console.log(`${mode}/${name}: 전체 + 상반신 생성`)
  }
}
console.log(`비서 이미지 ${made}장 처리 완료`)
