import { copyFileSync, existsSync, mkdirSync, readFileSync, appendFileSync } from 'fs'
import { spawnSync } from 'child_process'
import { join } from 'path'

/**
 * 프롬프트 JSONL(scripts/portrait-prompts.mjs 출력)을 한 줄씩 이미지 도구에
 * 넘겨 assets/players/<key>.png 로 받아 둔다. 이미 있는 키는 건너뛰므로
 * 중단됐다 다시 돌려도 된다. 진행 상황은 로그 파일에 한 줄씩 남긴다.
 *
 *   node scripts/gen-portraits.mjs <prompts.jsonl> <log file>
 *
 * 이미지 도구는 Codex 플러그인의 companion(image_gen)이다 — 로컬 Codex CLI가
 * 로그인돼 있는 PC에서만 돈다. 무료라 장당 60~100초 걸린다.
 */
const [, , promptsPath, logPath] = process.argv
const COMPANION = 'C:/Users/yakir/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs'
const OUT = 'assets/players'
mkdirSync(OUT, { recursive: true })

const log = (line) => appendFileSync(logPath, `${new Date().toISOString()} ${line}\n`)
const lines = readFileSync(promptsPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
log(`start ${lines.length} prompts`)

let done = 0
for (const { key, prompt } of lines) {
  const target = join(OUT, `${key}.png`)
  if (existsSync(target) || existsSync(join(OUT, `${key}.webp`))) {
    log(`skip ${key}`)
    continue
  }
  const task = `Use your image generation tool (image_gen) to create ONE image. ${prompt} Do not modify repository files; leave the PNG in your generated_images folder and reply with ONLY the exact saved file path.`
  const res = spawnSync('node', [COMPANION, 'task', '--wait', task], { encoding: 'utf8', timeout: 10 * 60 * 1000 })
  const out = `${res.stdout ?? ''}\n${res.stderr ?? ''}`
  const match = out.match(/[A-Za-z]:\\[^\r\n]*?\.png/g)
  const path = match ? match[match.length - 1].trim() : null
  if (path && existsSync(path)) {
    copyFileSync(path, target)
    done += 1
    log(`ok ${key} <- ${path}`)
  } else {
    log(`FAIL ${key} :: ${out.slice(-300).replace(/\s+/g, ' ')}`)
  }
}
log(`done ${done}`)
