// 자동 생성 파일입니다. 고치지 마세요.
// lib/gacha.ts에서 만들어집니다: npm run build:functions

// lib/random.ts
function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t = t + 1831565813 >>> 0;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}
function pickInRange(seed, min, max) {
  return min + Math.floor(seededRandom(seed)() * (max - min + 1));
}

// lib/rarity.ts
var RARITIES = ["Normal", "Rare", "Legend", "Live", "World"];

// lib/players.ts
var POSITION_GROUP = {
  GK: "GK",
  CB: "DF",
  LB: "DF",
  RB: "DF",
  CDM: "MF",
  CM: "MF",
  CAM: "MF",
  LM: "MF",
  RM: "MF",
  LW: "FW",
  RW: "FW",
  ST: "FW"
};
var OVR_WEIGHTS = {
  GK: { pac: 0.05, sho: 0, pas: 0.1, dri: 0.05, def: 0.6, phy: 0.2 },
  CB: { pac: 0.1, sho: 0.02, pas: 0.08, dri: 0.05, def: 0.45, phy: 0.3 },
  LB: { pac: 0.22, sho: 0.05, pas: 0.18, dri: 0.15, def: 0.28, phy: 0.12 },
  RB: { pac: 0.22, sho: 0.05, pas: 0.18, dri: 0.15, def: 0.28, phy: 0.12 },
  CDM: { pac: 0.08, sho: 0.06, pas: 0.24, dri: 0.12, def: 0.35, phy: 0.15 },
  CM: { pac: 0.1, sho: 0.14, pas: 0.32, dri: 0.22, def: 0.14, phy: 0.08 },
  CAM: { pac: 0.12, sho: 0.22, pas: 0.3, dri: 0.28, def: 0.03, phy: 0.05 },
  LM: { pac: 0.22, sho: 0.14, pas: 0.24, dri: 0.28, def: 0.06, phy: 0.06 },
  RM: { pac: 0.22, sho: 0.14, pas: 0.24, dri: 0.28, def: 0.06, phy: 0.06 },
  LW: { pac: 0.25, sho: 0.22, pas: 0.15, dri: 0.3, def: 0.02, phy: 0.06 },
  RW: { pac: 0.25, sho: 0.22, pas: 0.15, dri: 0.3, def: 0.02, phy: 0.06 },
  ST: { pac: 0.22, sho: 0.36, pas: 0.08, dri: 0.2, def: 0.01, phy: 0.13 }
};
var ARCHETYPE = {
  GK: { pac: -25, sho: -45, pas: -12, dri: -25, def: 12, phy: 6 },
  CB: { pac: -8, sho: -30, pas: -10, dri: -14, def: 14, phy: 12 },
  LB: { pac: 8, sho: -18, pas: 2, dri: 0, def: 6, phy: -2 },
  RB: { pac: 8, sho: -18, pas: 2, dri: 0, def: 6, phy: -2 },
  CDM: { pac: -4, sho: -10, pas: 4, dri: -2, def: 12, phy: 8 },
  CM: { pac: -2, sho: 0, pas: 10, dri: 4, def: 0, phy: 0 },
  CAM: { pac: 2, sho: 6, pas: 10, dri: 10, def: -22, phy: -8 },
  LM: { pac: 8, sho: 0, pas: 6, dri: 8, def: -12, phy: -6 },
  RM: { pac: 8, sho: 0, pas: 6, dri: 8, def: -12, phy: -6 },
  LW: { pac: 12, sho: 6, pas: 0, dri: 12, def: -28, phy: -10 },
  RW: { pac: 12, sho: 6, pas: 0, dri: 12, def: -28, phy: -10 },
  ST: { pac: 8, sho: 14, pas: -8, dri: 6, def: -32, phy: 4 }
};
var STAT_KEYS = ["pac", "sho", "pas", "dri", "def", "phy"];
var clamp = (n, min, max) => Math.max(min, Math.min(max, n));
function computeOvr(stats, position) {
  const w = OVR_WEIGHTS[position];
  const total = STAT_KEYS.reduce((sum, key) => sum + stats[key] * w[key], 0);
  return Math.round(total);
}
function buildStats(id, position, target) {
  const rng = seededRandom(hashString(id));
  const shape = ARCHETYPE[position];
  const raw = {};
  for (const key of STAT_KEYS) {
    raw[key] = target + shape[key] + (rng() * 8 - 4);
  }
  const w = OVR_WEIGHTS[position];
  const mean = STAT_KEYS.reduce((sum, key) => sum + raw[key] * w[key], 0);
  const shift = target - mean;
  const stats = {};
  for (const key of STAT_KEYS) {
    stats[key] = clamp(Math.round(raw[key] + shift), 24, 99);
  }
  return stats;
}
var NEARBY_POSITIONS = {
  GK: [],
  CB: ["CDM"],
  LB: ["LM", "CB"],
  RB: ["RM", "CB"],
  CDM: ["CM", "CB"],
  CM: ["CDM", "CAM"],
  CAM: ["CM", "LM", "RM"],
  LM: ["LW", "LB"],
  RM: ["RW", "RB"],
  LW: ["LM", "ST"],
  RW: ["RM", "ST"],
  ST: ["CAM", "LW", "RW"]
};
var HIDDEN_RANGE = {
  Normal: [0, 3],
  Rare: [2, 5],
  Legend: [5, 8],
  Live: [7, 10],
  World: [9, 12]
};
function buildPositions(id, position, rarity) {
  if (position === "GK") return ["GK"];
  const nearby = NEARBY_POSITIONS[position];
  const extra = pickInRange(hashString(`${id}:pos`), 0, rarity === "Normal" ? 1 : 2);
  return [position, ...nearby.slice(0, Math.min(extra, nearby.length))];
}
function buildHidden(id, rarity) {
  const [min, max] = HIDDEN_RANGE[rarity];
  const rng = seededRandom(hashString(`${id}:hidden`));
  const roll = () => min + Math.round(rng() * (max - min));
  return { clutch: roll(), stamina: roll(), bigMatch: roll(), consistency: roll() };
}
var NATIONS = [
  "\uB300\uD55C\uBBFC\uAD6D",
  "\uBE0C\uB77C\uC9C8",
  "\uC789\uAE00\uB79C\uB4DC",
  "\uC2A4\uD398\uC778",
  "\uD504\uB791\uC2A4",
  "\uB3C5\uC77C",
  "\uC774\uD0C8\uB9AC\uC544",
  "\uC544\uB974\uD5E8\uD2F0\uB098",
  "\uD3EC\uB974\uD22C\uAC08",
  "\uB124\uB35C\uB780\uB4DC",
  "\uBCA8\uAE30\uC5D0",
  "\uB178\uB974\uC6E8\uC774",
  "\uD06C\uB85C\uC544\uD2F0\uC544",
  "\uC774\uC9D1\uD2B8",
  "\uC77C\uBCF8"
];
var CLUBS = [
  { name: "\uC804\uBD81 \uBAA8\uD130\uC2A4", league: "\uCF54\uB9AC\uC544 \uB9AC\uADF8" },
  { name: "\uC6B8\uC0B0 \uD638\uB791", league: "\uCF54\uB9AC\uC544 \uB9AC\uADF8" },
  { name: "\uD3EC\uD56D \uC2A4\uD2F8\uB9E8", league: "\uCF54\uB9AC\uC544 \uB9AC\uADF8" },
  { name: "\uC11C\uC6B8 \uCE90\uD53C\uD0C8", league: "\uCF54\uB9AC\uC544 \uB9AC\uADF8" },
  { name: "\uC218\uC6D0 \uBE14\uB8E8\uBC84\uB4DC", league: "\uCF54\uB9AC\uC544 \uB9AC\uADF8" },
  { name: "\uB9E8\uCCB4\uC2A4 \uB808\uC988", league: "\uD0B9\uB364 \uB9AC\uADF8" },
  { name: "\uB9E8\uCCB4\uC2A4 \uBE14\uB8E8", league: "\uD0B9\uB364 \uB9AC\uADF8" },
  { name: "\uB9AC\uBC84 \uBA38\uC9C0", league: "\uD0B9\uB364 \uB9AC\uADF8" },
  { name: "\uB7F0\uB358 \uBE14\uB8E8\uC2A4", league: "\uD0B9\uB364 \uB9AC\uADF8" },
  { name: "\uBD81\uB7F0\uB358 \uAC74\uB108\uC2A4", league: "\uD0B9\uB364 \uB9AC\uADF8" },
  { name: "\uBD81\uB7F0\uB358 \uD654\uC774\uD2B8", league: "\uD0B9\uB364 \uB9AC\uADF8" },
  { name: "\uB9C8\uB4DC\uB9AC\uB4DC \uBE14\uB791\uCF54", league: "\uC774\uBCA0\uB9AC\uC544 \uB9AC\uAC00" },
  { name: "\uCE74\uD0C8\uB8E8\uB0D0 \uBE14\uB77C\uC6B0", league: "\uC774\uBCA0\uB9AC\uC544 \uB9AC\uAC00" },
  { name: "\uB9C8\uB4DC\uB9AC\uB4DC \uB85C\uD788\uBE14\uB791", league: "\uC774\uBCA0\uB9AC\uC544 \uB9AC\uAC00" },
  { name: "\uC138\uBE44\uC57C \uB85C\uD638", league: "\uC774\uBCA0\uB9AC\uC544 \uB9AC\uAC00" },
  { name: "\uBC1C\uB80C\uC2DC\uC544 \uBC14\uD2B8", league: "\uC774\uBCA0\uB9AC\uC544 \uB9AC\uAC00" },
  { name: "\uBC00\uB77C\uB178 \uB124\uB85C", league: "\uCF58\uD2F0\uB128\uD0C8 \uB9AC\uADF8" },
  { name: "\uD1A0\uB9AC\uB178 \uBE44\uC559\uCF54", league: "\uCF58\uD2F0\uB128\uD0C8 \uB9AC\uADF8" },
  { name: "\uBB8C\uD5E8 \uBC14\uBC14\uB9AC\uC548", league: "\uCF58\uD2F0\uB128\uD0C8 \uB9AC\uADF8" },
  { name: "\uD30C\uB9AC \uCE90\uD53C\uD0C8", league: "\uCF58\uD2F0\uB128\uD0C8 \uB9AC\uADF8" },
  { name: "\uB3C4\uB974\uD2B8 \uC610\uB85C\uC6B0", league: "\uCF58\uD2F0\uB128\uD0C8 \uB9AC\uADF8" }
];
var LEAGUE_OF_CLUB = CLUBS.reduce(
  (map, club) => {
    map[club.name] = club.league;
    return map;
  },
  {}
);
var LEAGUES = Array.from(new Set(CLUBS.map((club) => club.league)));
var ROSTER = {
  Normal: [
    ["\uAE40\uC900\uC131", "GK", 58, "\uC804\uBD81 \uBAA8\uD130\uC2A4", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uBC15\uCCA0\uBCBD", "GK", 61, "\uC6B8\uC0B0 \uD638\uB791", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC774\uB9C9\uB0B4", "CB", 55, "\uD3EC\uD56D \uC2A4\uD2F8\uB9E8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uCD5C\uC218\uBE44", "CB", 60, "\uC11C\uC6B8 \uCE90\uD53C\uD0C8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC815\uD0DC\uD074", "CB", 57, "\uC218\uC6D0 \uBE14\uB8E8\uBC84\uB4DC", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uB178\uC7A5\uD604", "CB", 53, "\uC804\uBD81 \uBAA8\uD130\uC2A4", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uD55C\uB3D9\uB124", "LB", 56, "\uC6B8\uC0B0 \uD638\uB791", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uBC30\uD6C4\uBC29", "LB", 52, "\uD3EC\uD56D \uC2A4\uD2F8\uB9E8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC624\uB978\uBC1C", "RB", 58, "\uC11C\uC6B8 \uCE90\uD53C\uD0C8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC11C\uD3EC\uBC31", "RB", 54, "\uC218\uC6D0 \uBE14\uB8E8\uBC84\uB4DC", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uAC15\uC911\uC6D0", "CDM", 59, "\uC804\uBD81 \uBAA8\uD130\uC2A4", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uB3C4\uB8E8\uBB35", "CDM", 55, "\uC6B8\uC0B0 \uD638\uB791", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uB0A8\uAE30\uD6C8", "CM", 62, "\uD3EC\uD56D \uC2A4\uD2F8\uB9E8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC870\uD328\uC2A4", "CM", 57, "\uC11C\uC6B8 \uCE90\uD53C\uD0C8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC724\uB4DC\uB9AC", "CAM", 63, "\uC218\uC6D0 \uBE14\uB8E8\uBC84\uB4DC", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC784\uCE21\uBA74", "LM", 56, "\uC804\uBD81 \uBAA8\uD130\uC2A4", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uBC31\uC719\uC5B4", "RM", 58, "\uC6B8\uC0B0 \uD638\uB791", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC2E0\uBC1C\uB05D", "LW", 60, "\uD3EC\uD56D \uC2A4\uD2F8\uB9E8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uD669\uB3CC\uD30C", "RW", 61, "\uC11C\uC6B8 \uCE90\uD53C\uD0C8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uBB38\uC804\uC55E", "ST", 64, "\uC218\uC6D0 \uBE14\uB8E8\uBC84\uB4DC", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC720\uACE8\uB123", "ST", 59, "\uC804\uBD81 \uBAA8\uD130\uC2A4", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uCC28\uBCA4\uCE58", "ST", 54, "\uC6B8\uC0B0 \uD638\uB791", "\uC77C\uBCF8"]
  ],
  Rare: [
    ["\uC870\uD604\uC624", "GK", 75, "\uC6B8\uC0B0 \uD638\uB791", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uAD6C\uC131\uC724", "GK", 71, "\uC11C\uC6B8 \uCE90\uD53C\uD0C8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uAE40\uC601\uAC74", "CB", 73, "\uC804\uBD81 \uBAA8\uD130\uC2A4", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uAD8C\uACBD\uC5B8", "CB", 69, "\uD3EC\uD56D \uC2A4\uD2F8\uB9E8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uAE40\uC9C4\uC11C", "LB", 70, "\uC218\uC6D0 \uBE14\uB8E8\uBC84\uB4DC", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC774\uC6A9\uD76C", "RB", 72, "\uC11C\uC6B8 \uCE90\uD53C\uD0C8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC815\uC6B0\uC5F0", "CDM", 71, "\uC804\uBD81 \uBAA8\uD130\uC2A4", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uD669\uC778\uBC95", "CM", 72, "\uC804\uBD81 \uBAA8\uD130\uC2A4", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uBC31\uC2B9\uD6C8", "CM", 75, "\uB7F0\uB358 \uBE14\uB8E8\uC2A4", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC774\uC7AC\uC2B9", "CAM", 74, "\uBD81\uB7F0\uB358 \uAC74\uB108\uC2A4", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uD669\uD76C\uCC3D", "CAM", 78, "\uB9E8\uCCB4\uC2A4 \uB808\uC988", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC190\uD765\uB9E8", "LW", 76, "\uBD81\uB7F0\uB358 \uD654\uC774\uD2B8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC5C4\uC9C0\uCC3D", "RW", 74, "\uB3C4\uB974\uD2B8 \uC610\uB85C\uC6B0", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC815\uC6B0\uBE48", "RW", 73, "\uD3EC\uD56D \uC2A4\uD2F8\uB9E8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC624\uD604\uC2DD", "ST", 77, "\uC138\uBE44\uC57C \uB85C\uD638", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC870\uADDC\uC1A1", "ST", 72, "\uBC1C\uB80C\uC2DC\uC544 \uBC14\uD2B8", "\uB300\uD55C\uBBFC\uAD6D"]
  ],
  Legend: [
    ["\uC9C0\uC548\uB8E8 \uBD80\uD3F0", "GK", 83, "\uD1A0\uB9AC\uB178 \uBE44\uC559\uCF54", "\uC774\uD0C8\uB9AC\uC544"],
    ["\uD30C\uC62C\uB85C \uB9D0\uB514", "CB", 84, "\uBC00\uB77C\uB178 \uB124\uB85C", "\uC774\uD0C8\uB9AC\uC544"],
    ["\uC138\uB974\uD788 \uB77C\uBAA8", "CB", 83, "\uB9C8\uB4DC\uB9AC\uB4DC \uBE14\uB791\uCF54", "\uC2A4\uD398\uC778"],
    ["\uBC15\uC9C0\uC2B9", "CDM", 82, "\uB9E8\uCCB4\uC2A4 \uB808\uC988", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC0AC\uBE44 \uC5D0\uB974\uB09C", "CM", 85, "\uCE74\uD0C8\uB8E8\uB0D0 \uBE14\uB77C\uC6B0", "\uC2A4\uD398\uC778"],
    ["\uC9C0\uB124 \uC9C0\uB2E8", "CAM", 84, "\uB9C8\uB4DC\uB9AC\uB4DC \uBE14\uB791\uCF54", "\uD504\uB791\uC2A4"],
    ["\uC544\uB9AC\uC5D4 \uB85C\uBCA4", "LW", 86, "\uBB8C\uD5E8 \uBC14\uBC14\uB9AC\uC548", "\uB124\uB35C\uB780\uB4DC"],
    ["\uCC28\uBD04\uADFC", "RW", 85, "\uB3C4\uB974\uD2B8 \uC610\uB85C\uC6B0", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uD638\uB098\uC6B0 \uD398\uB178", "ST", 86, "\uCE74\uD0C8\uB8E8\uB0D0 \uBE14\uB77C\uC6B0", "\uBE0C\uB77C\uC9C8"],
    ["\uD544\uB9AC\uD3EC \uC778\uC790", "ST", 87, "\uBC00\uB77C\uB178 \uB124\uB85C", "\uC774\uD0C8\uB9AC\uC544"]
  ],
  Live: [
    ["\uC54C\uB9AC\uC190 \uBCA0\uCE74", "GK", 85, "\uB9AC\uBC84 \uBA38\uC9C0", "\uBE0C\uB77C\uC9C8"],
    ["\uAE40\uBBFC\uC81C", "CB", 86, "\uBB8C\uD5E8 \uBC14\uBC14\uB9AC\uC548", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uC8FC\uB4DC \uBCA8\uB9C1", "CM", 89, "\uB9C8\uB4DC\uB9AC\uB4DC \uBE14\uB791\uCF54", "\uC789\uAE00\uB79C\uB4DC"],
    ["\uC774\uAC15\uC724", "CAM", 86, "\uD30C\uB9AC \uCE90\uD53C\uD0C8", "\uB300\uD55C\uBBFC\uAD6D"],
    ["\uBE44\uB2C8\uC2DC\uC6B0", "LW", 87, "\uB9C8\uB4DC\uB9AC\uB4DC \uBE14\uB791\uCF54", "\uBE0C\uB77C\uC9C8"],
    ["\uBAA8 \uC0B4\uB77C", "RW", 88, "\uB9AC\uBC84 \uBA38\uC9C0", "\uC774\uC9D1\uD2B8"],
    ["\uC5D8\uB9C1 \uD640\uB780", "ST", 88, "\uB9E8\uCCB4\uC2A4 \uBE14\uB8E8", "\uB178\uB974\uC6E8\uC774"]
  ],
  World: [
    ["\uC580 \uB178\uC774\uB9CC", "GK", 92, "\uBB8C\uD5E8 \uBC14\uBC14\uB9AC\uC548", "\uB3C5\uC77C"],
    ["\uD310 \uB2E4\uC774\uCEE8", "CB", 91, "\uB9AC\uBC84 \uBA38\uC9C0", "\uB124\uB35C\uB780\uB4DC"],
    ["\uCF00\uBE48 \uB354\uBE0C\uB77C", "CM", 95, "\uB9E8\uCCB4\uC2A4 \uBE14\uB8E8", "\uBCA8\uAE30\uC5D0"],
    ["\uB9AC\uC624 \uBA54\uC2DC\uC544", "CAM", 93, "\uCE74\uD0C8\uB8E8\uB0D0 \uBE14\uB77C\uC6B0", "\uC544\uB974\uD5E8\uD2F0\uB098"],
    ["\uD06C\uB9AC\uC2A4 \uD638\uB0A0\uB4DC", "LW", 93, "\uB9C8\uB4DC\uB9AC\uB4DC \uBE14\uB791\uCF54", "\uD3EC\uB974\uD22C\uAC08"],
    ["\uD0AC\uB9AC\uC548 \uC74C\uBC14\uD53C", "ST", 94, "\uD30C\uB9AC \uCE90\uD53C\uD0C8", "\uD504\uB791\uC2A4"]
  ]
};
var RARITY_PREFIX = {
  Normal: "n",
  Rare: "r",
  Legend: "lg",
  Live: "lv",
  World: "w"
};
function buildRoster() {
  const players = [];
  for (const rarity of Object.keys(ROSTER)) {
    ROSTER[rarity].forEach(([name, position, ovr, clubName, nation], index) => {
      const id = `${RARITY_PREFIX[rarity]}${String(index + 1).padStart(2, "0")}`;
      const stats = buildStats(id, position, ovr);
      const rng = seededRandom(hashString(id + name));
      const club = CLUBS.find((item) => item.name === clubName) ?? CLUBS[Math.floor(rng() * CLUBS.length)];
      players.push({
        id,
        name,
        position,
        positions: buildPositions(id, position, rarity),
        rarity,
        nation: nation ?? NATIONS[Math.floor(rng() * NATIONS.length)],
        club: club.name,
        league: club.league,
        stats,
        hidden: buildHidden(id, rarity),
        ovr: computeOvr(stats, position)
      });
    });
  }
  return players;
}
var PLAYERS = buildRoster();
var PLAYERS_BY_ID = PLAYERS.reduce(
  (map, player) => {
    map[player.id] = player;
    return map;
  },
  {}
);
var PLAYERS_BY_RARITY = PLAYERS.reduce(
  (map, player) => {
    ;
    (map[player.rarity] ||= []).push(player);
    return map;
  },
  {}
);

// lib/gacha.ts
var DRAW_TEN_SIZE = 10;
var PITY_LIMIT = 30;
var PITY_RARITY = "Legend";
var PACK_RATES = {
  basic: { Normal: 55, Rare: 30, Legend: 10, Live: 3.5, World: 1.5 },
  premium: { Normal: 12, Rare: 33, Legend: 33, Live: 15, World: 7 }
};
var PACKS = [
  {
    id: "basic",
    family: "basic",
    name: "\uC77C\uBC18\uD329",
    description: "\uCE74\uB4DC 1\uC7A5",
    cost: 300,
    count: 1,
    rates: PACK_RATES.basic
  },
  {
    id: "basicTen",
    family: "basic",
    name: "\uC77C\uBC18\uD329 10\uC5F0\uCC28",
    description: "10\uC7A5 \xB7 \uC2E4\uBC84 \uC774\uC0C1 1\uC7A5 \uBCF4\uC7A5",
    cost: 2700,
    count: DRAW_TEN_SIZE,
    rates: PACK_RATES.basic,
    guarantee: "Rare"
  },
  {
    id: "premium",
    family: "premium",
    name: "\uD504\uB9AC\uBBF8\uC5C4\uD329",
    description: "\uACE0\uAE09 \uCE74\uB4DC \uD655\uB960\uC774 \uD06C\uAC8C \uB192\uC2B5\uB2C8\uB2E4",
    cost: 1200,
    count: 1,
    rates: PACK_RATES.premium
  },
  {
    id: "premiumTen",
    family: "premium",
    name: "\uD504\uB9AC\uBBF8\uC5C4\uD329 10\uC5F0\uCC28",
    description: "10\uC7A5 \xB7 \uACE8\uB4DC \uC774\uC0C1 1\uC7A5 \uBCF4\uC7A5",
    cost: 10800,
    count: DRAW_TEN_SIZE,
    rates: PACK_RATES.premium,
    guarantee: "Legend"
  }
];
var DRAW_COST = PACKS[0].cost;
var DRAW_TEN_COST = PACKS[1].cost;
function packOf(id) {
  return PACKS.find((pack) => pack.id === id) ?? PACKS[0];
}
function packsOfFamily(family) {
  return PACKS.filter((pack) => pack.family === family);
}
var rarityIndex = (rarity) => RARITIES.indexOf(rarity);
function rollRarity(rng = Math.random, minRarity, rates = PACK_RATES.basic) {
  const total = RARITIES.reduce((sum, rarity) => sum + (rates[rarity] ?? 0), 0);
  const roll = rng() * total;
  let cumulative = 0;
  let rolled = "Normal";
  for (const rarity of RARITIES) {
    cumulative += rates[rarity] ?? 0;
    if (roll < cumulative) {
      rolled = rarity;
      break;
    }
  }
  if (minRarity && rarityIndex(rolled) < rarityIndex(minRarity)) return minRarity;
  return rolled;
}
function poolFor(rarity, group) {
  const pool = PLAYERS_BY_RARITY[rarity];
  if (!group) return pool;
  const filtered = pool.filter((player) => POSITION_GROUP[player.position] === group);
  return filtered.length > 0 ? filtered : pool;
}
function pick(rarity, rng, group, featured) {
  if (featured && featured.rarity === rarity && (!group || POSITION_GROUP[featured.position] === group)) {
    if (rng() < 0.5) return featured;
  }
  const pool = poolFor(rarity, group);
  return pool[Math.floor(rng() * pool.length)];
}
var PICKUP_OFFSET_MINUTES = 9 * 60;
function pickupWeekKey(now = /* @__PURE__ */ new Date()) {
  const shifted = new Date(now.getTime() + PICKUP_OFFSET_MINUTES * 6e4);
  const day = (shifted.getUTCDay() + 6) % 7;
  shifted.setUTCDate(shifted.getUTCDate() - day);
  return shifted.toISOString().slice(0, 10);
}
function featuredPlayer(weekKey) {
  const pool = PLAYERS.filter((player) => ["Legend", "Live", "World"].includes(player.rarity));
  const seed = weekKey.split("").reduce((hash, char) => hash * 31 + char.charCodeAt(0) >>> 0, 7);
  return pool[Math.floor(seededRandom(seed)() * pool.length)];
}
function drawSession({
  count,
  pity = 0,
  featured = null,
  group = null,
  minRarity = null,
  guarantee = null,
  rates = PACK_RATES.basic,
  rng = Math.random
}) {
  const players = [];
  let counter = pity;
  let pityHit = false;
  for (let i = 0; i < count; i++) {
    let rarity;
    if (counter + 1 >= PITY_LIMIT) {
      rarity = rollRarity(rng, PITY_RARITY, rates);
      pityHit = true;
    } else {
      rarity = rollRarity(rng, minRarity, rates);
    }
    if (rarityIndex(rarity) >= rarityIndex(PITY_RARITY)) counter = 0;
    else counter += 1;
    players.push(pick(rarity, rng, group, featured));
  }
  if (guarantee && !players.some((player) => rarityIndex(player.rarity) >= rarityIndex(guarantee))) {
    const index = Math.floor(rng() * players.length);
    players[index] = pick(guarantee, rng, group, featured);
  }
  return { players, pity: counter, pityHit };
}
function drawOne(rng = Math.random) {
  return drawSession({ count: 1, rng }).players[0];
}
function drawMany(count, rng = Math.random) {
  return drawSession({
    count,
    guarantee: count >= DRAW_TEN_SIZE ? "Rare" : null,
    rng
  }).players;
}
function drawCost(count) {
  return count >= DRAW_TEN_SIZE ? DRAW_TEN_COST : DRAW_COST * count;
}
export {
  DRAW_COST,
  DRAW_TEN_COST,
  DRAW_TEN_SIZE,
  PACKS,
  PACK_RATES,
  PICKUP_OFFSET_MINUTES,
  PITY_LIMIT,
  PITY_RARITY,
  drawCost,
  drawMany,
  drawOne,
  drawSession,
  featuredPlayer,
  packOf,
  packsOfFamily,
  pickupWeekKey,
  rollRarity
};
