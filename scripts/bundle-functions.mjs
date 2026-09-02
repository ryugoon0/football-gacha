import { build } from 'esbuild'

/**
 * Bundles the game's own gacha logic for the Edge Function.
 *
 * The odds must exist in exactly one place. Rewriting them in PL/pgSQL or in
 * the function would give us two implementations that can drift, and the odds
 * are what we publish to players — two versions means two truths. So the
 * function imports this bundle, built from the same lib/ the game uses.
 *
 * Run `npm run build:functions` after changing anything under lib/.
 */
await build({
  entryPoints: ['lib/gacha.ts'],
  outfile: 'supabase/functions/draw-pack/shared.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  banner: {
    js: '// 자동 생성 파일입니다. 고치지 마세요.\n// lib/gacha.ts에서 만들어집니다: npm run build:functions',
  },
})

console.log('supabase/functions/draw-pack/shared.js 생성 완료')
