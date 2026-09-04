import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * 초상 생성 프롬프트를 선수마다 한 줄(JSON)로 찍는다. 이미지 도구에 넘기는
 * 배치 스크립트가 읽는다. 실존 인물 사진은 쓰지 않는다 — 국적·나이·포지션
 * 체격과, 키에서 결정론적으로 뽑은 머리·수염·표정만으로 가상 얼굴을 만든다.
 *
 * 실행: node scripts/portrait-prompts.mjs [clubSlug]
 */
const only = process.argv[2]
const YEAR = 2026

const ETHNICITY = {
  대한민국: 'Korean',
  일본: 'Japanese',
  브라질: 'Brazilian',
  스웨덴: 'Swedish',
  네덜란드: 'Dutch',
  폴란드: 'Polish',
  미국: 'American',
  잉글랜드: 'English',
  스페인: 'Spanish',
  독일: 'German',
  이탈리아: 'Italian',
  프랑스: 'French',
  아르헨티나: 'Argentine',
  포르투갈: 'Portuguese',
  벨기에: 'Belgian',
  모로코: 'Moroccan',
  웨일스: 'Welsh',
  덴마크: 'Danish',
  코트디부아르: 'Ivorian',
  카메룬: 'Cameroonian',
  우루과이: 'Uruguayan',
  슬로베니아: 'Slovenian',
  스코틀랜드: 'Scottish',
  북아일랜드: 'Northern Irish',
  노르웨이: 'Norwegian',
  크로아티아: 'Croatian',
  이집트: 'Egyptian',
}
const BUILD = {
  GK: 'tall, broad-shouldered goalkeeper build',
  CB: 'tall, sturdy centre-back build',
  LB: 'lean, athletic full-back build',
  RB: 'lean, athletic full-back build',
  CDM: 'compact, strong midfielder build',
  CM: 'athletic midfielder build',
  CAM: 'slim playmaker build',
  LM: 'wiry winger build',
  RM: 'wiry winger build',
  LW: 'wiry winger build',
  RW: 'wiry winger build',
  ST: 'powerful striker build',
}
const HAIR = ['short black hair', 'short dark hair, slightly tousled', 'buzz cut', 'medium-length dark hair swept back', 'short hair with a neat fade', 'curly short hair']
const FACIAL = ['clean-shaven', 'clean-shaven', 'light stubble', 'short beard', 'clean-shaven']
const MOOD = ['calm, confident', 'focused, slight smile', 'serious, determined', 'relaxed, friendly']

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
const pick = (list, seed) => list[seed % list.length]

for (const file of readdirSync('data/squads').filter((f) => f.endsWith('.json')).sort()) {
  const squad = JSON.parse(readFileSync(join('data/squads', file), 'utf8'))
  for (const p of squad.players) {
    if (only && !p.key.startsWith(only)) continue
    const age = YEAR - p.birthYear
    const seed = hash(p.key)
    const prompt = [
      `Photorealistic official club headshot of a fictional ${ETHNICITY[p.nation] ?? p.nation} male professional footballer, age ${age},`,
      `${BUILD[p.pos] ?? 'athletic build'}, ${pick(HAIR, seed)}, ${pick(FACIAL, seed >> 3)}, ${pick(MOOD, seed >> 6)} expression.`,
      'Head and shoulders, facing the camera, wearing a plain dark training top with no logos or text,',
      'neutral dark grey studio background, soft even lighting, sharp focus, 3:4 vertical.',
      'The face must be an invented person and must not resemble any real athlete or celebrity.',
    ].join(' ')
    console.log(JSON.stringify({ key: p.key, prompt }))
  }
}
