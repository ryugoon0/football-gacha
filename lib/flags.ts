/**
 * Small marks a card can wear at thumbnail size: a flag for the nation and a
 * short, colour-coded tag for the league. Flags are plain emoji so nothing
 * needs shipping; unknown nations get a neutral ball.
 */
const FLAGS: Record<string, string> = {
  대한민국: '🇰🇷',
  일본: '🇯🇵',
  브라질: '🇧🇷',
  잉글랜드: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  스코틀랜드: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  웨일스: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  북아일랜드: '🇬🇧',
  스페인: '🇪🇸',
  프랑스: '🇫🇷',
  독일: '🇩🇪',
  이탈리아: '🇮🇹',
  아르헨티나: '🇦🇷',
  포르투갈: '🇵🇹',
  네덜란드: '🇳🇱',
  벨기에: '🇧🇪',
  노르웨이: '🇳🇴',
  크로아티아: '🇭🇷',
  이집트: '🇪🇬',
  스웨덴: '🇸🇪',
  폴란드: '🇵🇱',
  미국: '🇺🇸',
  모로코: '🇲🇦',
  덴마크: '🇩🇰',
  코트디부아르: '🇨🇮',
  카메룬: '🇨🇲',
  우루과이: '🇺🇾',
  슬로베니아: '🇸🇮',
  세네갈: '🇸🇳',
  나이지리아: '🇳🇬',
  가나: '🇬🇭',
  콜롬비아: '🇨🇴',
  멕시코: '🇲🇽',
  튀르키예: '🇹🇷',
  터키: '🇹🇷',
  오스트리아: '🇦🇹',
  스위스: '🇨🇭',
  세르비아: '🇷🇸',
  체코: '🇨🇿',
  우크라이나: '🇺🇦',
  호주: '🇦🇺',
  캐나다: '🇨🇦',
  칠레: '🇨🇱',
  이란: '🇮🇷',
  사우디아라비아: '🇸🇦',
}

export function flagOf(nation: string): string {
  return FLAGS[nation] ?? '⚽'
}

/** League → short tag and a colour the eye can learn in a week. */
const LEAGUE_TAGS: Record<string, { short: string; className: string }> = {
  '코리아 리그': { short: 'K', className: 'bg-red-600 text-white' },
  '킹덤 리그': { short: 'PL', className: 'bg-purple-700 text-white' },
  '이베리아 리가': { short: 'LL', className: 'bg-orange-500 text-white' },
  '게르만 리가': { short: 'BL', className: 'bg-rose-700 text-white' },
  '아주로 세리에': { short: 'SA', className: 'bg-sky-700 text-white' },
  '트리콜로 리그': { short: 'L1', className: 'bg-blue-800 text-white' },
  '루소 프리메라': { short: 'PT', className: 'bg-green-700 text-white' },
  '오라녜 에레디': { short: 'ED', className: 'bg-amber-600 text-white' },
  '콘티넨탈 리그': { short: 'CL', className: 'bg-indigo-700 text-white' },
}

export function leagueTag(league: string): { short: string; className: string } {
  return LEAGUE_TAGS[league] ?? { short: league.slice(0, 2), className: 'bg-slate-700 text-white' }
}
