// Builds complete playable scene maps (a story "level") from a compact AI-written spec, and wires a bundle's quests to them.
// Pure and deterministic (seeded by the scene id): the same spec always gives the same map. Used by the Worker and the Admin Studio.

export const THEMES = {
  home:       { base: '.', wall: '#', top: 'W', rug: 'r', indoor: true,  decor: ['plant', 'lamp', 'shelf'] },
  hotel:      { base: 'c', wall: '#', top: 'W', rug: 'r', indoor: true,  decor: ['plant', 'lamp', 'sofa'] },
  restaurant: { base: 't', wall: '#', top: 'W', rug: 'r', indoor: true,  decor: ['plant', 'lamp', 'table'] },
  shop:       { base: '.', wall: '#', top: 'W', rug: 'r', indoor: true,  decor: ['plant', 'shelf', 'lamp'] },
  airport:    { base: 't', wall: '#', top: 'W', rug: 'c', indoor: true,  decor: ['plant', 'sofa', 'lamp'] },
  office:     { base: 't', wall: '#', top: 'W', rug: 'r', indoor: true,  decor: ['plant', 'shelf', 'desk'] },
  street:     { base: 'A', wall: '=', top: null, rug: 'p', indoor: false, decor: ['lamp', 'bush', 'tree'] },
  park:       { base: 'g', wall: '=', top: null, rug: 'p', indoor: false, decor: ['tree', 'bush', 'rock'] },
  beach:      { base: 's', wall: '=', top: null, rug: 'D', indoor: false, decor: ['umbrella', 'rock', 'bush'], water: 3 },
  yard:       { base: 'g', wall: '=', top: null, rug: 'p', indoor: false, decor: ['tree', 'bush', 'lamp'] },
  market:     { base: 'S', wall: '=', top: null, rug: 'p', indoor: false, decor: ['lamp', 'plant', 'bush'] },
  pool:       { base: 'D', wall: '=', top: null, rug: 'p', indoor: false, decor: ['umbrella', 'plant', 'lamp'] },
};
const LEGEND = { g: 'grass', f: 'flower', p: 'path', '.': 'wood', t: 'tile', r: 'rug', '#': 'wall', W: 'wallface', '~': 'water', s: 'sand', '=': 'fence', d: 'dark', c: 'carpet', '^': 'roof', S: 'stone', T: 'tatami', A: 'asphalt', L: 'lane', Q: 'pool', D: 'deck', K: 'kotel', C: 'cloud' };
const SIZES = { small: [18, 11], medium: [22, 13], large: [26, 15] };
// footprint of a prop in tiles [w,h] (x,y is the bottom-left tile; it grows right and up)
const FP = { tree: [2, 2], bush: [1, 1], rock: [1, 1], table: [2, 2], sofa: [2, 2], bed: [2, 2], fridge: [1, 2], stove: [1, 2], tv: [2, 2], plant: [1, 2], sign: [1, 2], chest: [1, 1], shelf: [1, 2], counter: [3, 2], umbrella: [2, 2], lamp: [1, 2], door: [1, 2], mat: [1, 1], boat: [3, 2], deer: [2, 2], car: [3, 2], suitcase: [1, 1], salad: [1, 1], crib: [2, 2], album: [2, 1], ship: [4, 3], desk: [3, 2], lantern: [1, 2], torii: [3, 3], podium: [2, 2] };
const WALL_PROPS = new Set(['shelf', 'fridge', 'stove', 'tv', 'counter', 'bed', 'crib', 'sofa', 'desk']);
const fp = (t) => FP[t] || [2, 2];

function rngFor(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** @returns a complete map object (same shape as content/maps.json entries) */
export function buildScene(spec) {
  const id = spec.id, th = THEMES[spec.theme] || THEMES.home, rnd = rngFor(id);
  const [W, H] = SIZES[spec.size] || SIZES.medium;
  const g = Array.from({ length: H }, () => Array(W).fill(th.base));
  const rect = (x, y, w, h, ch) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (yy >= 0 && yy < H && xx >= 0 && xx < W) g[yy][xx] = ch; };
  rect(0, 0, W, 1, th.wall); rect(0, H - 1, W, 1, th.wall); rect(0, 0, 1, H, th.wall); rect(W - 1, 0, 1, H, th.wall);
  if (th.top) rect(1, 1, W - 2, 1, th.top);
  if (th.water) { rect(1, 1, W - 2, th.water, '~'); }
  const top = th.water ? th.water + 1 : 2;               // first walkable row
  if (th.indoor) rect(Math.floor(W / 2) - 3, Math.floor(H / 2) - 1, 7, 3, th.rug);
  else if (spec.theme === 'beach') rect(3, top + 1, W - 6, 2, th.rug);
  else { rect(1, Math.floor(H / 2), W - 2, 2, th.rug); rect(Math.floor(W / 2), top, 2, H - top - 1, th.rug); }

  const spawn = { x: 3, y: H - 3 };
  const occ = new Set();           // tiles that may not hold another object (footprints + 1 tile of padding)
  const solid = new Set();         // exact footprint tiles
  const mark = (x, topY, w, h, pad) => { for (let xx = x - pad; xx < x + w + pad; xx++) for (let yy = topY - pad; yy < topY + h + pad; yy++) occ.add(xx + ',' + yy); };
  const props = [], npcs = [], pickups = [];
  const addProp = (p) => { const [w, h] = fp(p.type); props.push(p); for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) solid.add((p.x + dx) + ',' + (p.y - dy)); mark(p.x, p.y - h + 1, w, h, 1); };
  props.push({ type: 'door', x: 1, y: H - 3, id: 'exit', interact: { action: 'exit' } });
  for (let dx = 0; dx <= 4; dx++) for (let dy = -1; dy <= 1; dy++) occ.add((1 + dx) + ',' + (H - 3 + dy));
  const inside = (x, y, w, h) => x >= 1 && x + w <= W - 1 && y - h + 1 >= top && y <= H - 2;
  const free1 = (x, y) => !occ.has(x + ',' + y) && x >= 1 && x <= W - 2 && y >= top && y <= H - 2;
  const placeProp = (spec2) => {
    const [w, h] = fp(spec2.type);
    for (let tries = 0; tries < 160; tries++) {
      let x, y;
      if (th.indoor && WALL_PROPS.has(spec2.type) && tries < 90) { x = 1 + Math.floor(rnd() * (W - 2 - w)); y = top + h - 1; }
      else { x = 1 + Math.floor(rnd() * (W - 2 - w)); y = top + h - 1 + Math.floor(rnd() * (H - top - h - 1)); }
      if (!inside(x, y, w, h)) continue;
      let ok = true;
      for (let dx = 0; dx < w && ok; dx++) for (let dy = 0; dy < h; dy++) if (occ.has((x + dx) + ',' + (y - dy))) { ok = false; break; }
      if (!ok) continue;
      addProp({ ...spec2, x, y }); return true;
    }
    return false;
  };
  const propById = (pid) => props.find((p) => p.id === pid);
  const nearTiles = (p, dmin, dmax) => {
    const [w, h] = fp(p.type), out = [];
    for (let y = top; y <= H - 2; y++) for (let x = 1; x <= W - 2; x++) {
      if (occ.has(x + ',' + y)) continue;
      const dx = Math.max(p.x - x, 0, x - (p.x + w - 1)), dy = Math.max((p.y - h + 1) - y, 0, y - p.y), d = Math.max(dx, dy);
      if (d >= dmin && d <= dmax) out.push({ x, y });
    }
    return out;
  };
  const freeTile = (near) => {
    let pool = [];
    if (near && propById(near)) pool = nearTiles(propById(near), 2, 3);
    if (!pool.length) for (let y = top; y <= H - 2; y++) for (let x = 1; x <= W - 2; x++) if (!occ.has(x + ',' + y) && Math.hypot(x - spawn.x, y - spawn.y) >= 4) pool.push({ x, y });
    if (!pool.length) return null;
    const t = pool[Math.floor(rnd() * pool.length)];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) occ.add((t.x + dx) + ',' + (t.y + dy));
    return t;
  };

  for (const p of spec.props || []) { if (!p?.type) continue; const { x, y, ...rest } = p; placeProp(rest); }
  for (const n of spec.npcs || []) { const t = freeTile(n.near); if (!t) continue; npcs.push({ id: n.id, x: t.x, y: t.y, dir: Math.floor(rnd() * 4), ...(n.gives ? { gives: n.gives, uid: n.id, givesText: n.givesText, emptyText: n.emptyText } : {}) }); }
  for (const pk of spec.pickups || []) for (let i = 0; i < (pk.count || 1); i++) { const t = freeTile(pk.near); if (!t) break; pickups.push({ id: `${id}_${pk.item}_${i}`, item: pk.item, x: t.x, y: t.y, hidden: !!pk.hidden, needsQuest: pk.quest }); }
  // decoration last, so it never blocks the story
  const nDeco = Math.max(3, Math.round((W * H) / 45));
  for (let i = 0; i < nDeco; i++) placeProp({ type: th.decor[Math.floor(rnd() * th.decor.length)] });

  return { id, name: spec.name || id, music: spec.music || (th.indoor ? 'town' : 'beach'), legend: LEGEND, tiles: g.map((r) => r.join('')), props, npcs, pickups, doors: [], spawn };
}

/**
 * Turns a bundle's `scenes` into full `maps`, and finishes its quests (scene entry, order, callers, auto-placed cast / things to collect / missing props).
 * Mutates and returns the bundle. `content` is the existing game content (for ids / order).
 */
export function compileBundle(bundle, content) {
  if (!bundle) return bundle;
  const specs = Array.isArray(bundle.scenes) ? bundle.scenes : Object.values(bundle.scenes || {});
  const chars = Object.keys(content.characters || {});
  const qs = Object.values(bundle.quests || {});
  const questsOf = (sid) => qs.filter((q) => (q.maps || []).includes(sid) || q.scene?.map === sid);
  // 1. add what the quests need to the specs (cast, talk-to people, things to collect, objects referenced by steps)
  for (const sp of specs) {
    sp.props ||= []; sp.npcs ||= []; sp.pickups ||= [];
    const hasNpc = (nid) => sp.npcs.some((n) => n.id === nid), hasProp = (pid) => sp.props.some((p) => p.id === pid);
    for (const q of questsOf(sp.id)) {
      const first = (q.maps && q.maps[0]) || q.scene?.map;
      // everybody who speaks in the story's scenes is part of the cast (family members and known characters)
      const known = (id) => (content.characters || {})[id] || (content.npcs || {})[id] || (bundle.npcs || {})[id];
      const speakers = new Set(q.cast || []);
      for (const s of q.steps || []) for (const ln of [...(s.lines || []), ...(s.type === 'choice' ? (s.options || []).flatMap((o) => o.reply || []) : [])]) if (ln.who && known(ln.who)) speakers.add(ln.who);
      q.cast = [...speakers];
      if (first === sp.id) for (const c of q.cast || []) if ((content.npcs?.[c] || bundle.npcs?.[c]) && !hasNpc(c)) sp.npcs.push({ id: c });
      for (const s of q.steps || []) {
        if (s.type === 'talk' && s.npc && !hasNpc(s.npc) && first === sp.id) sp.npcs.push({ id: s.npc });
        const target = s.type === 'interact' || s.type === 'use' ? s.target : s.type === 'minigame' && !s.auto ? s.at : null;
        if (target && !hasProp(target) && !(content.npcs?.[target] || bundle.npcs?.[target]) && first === sp.id) sp.props.push({ type: 'chest', id: target });
        if (s.type === 'collect' && !sp.pickups.some((p) => p.item === s.item) && !sp.props.some((p) => p.gives === s.item) && !sp.npcs.some((n) => n.gives === s.item) && !(q.steps || []).some((o) => o.give === s.item) && first === sp.id) sp.pickups.push({ item: s.item, count: s.count || 1, hidden: false, quest: q.id });
      }
    }
    for (const pk of sp.pickups) if (!pk.quest) pk.quest = questsOf(sp.id)[0]?.id;
  }
  const maps = { ...(bundle.maps || {}) };
  for (const sp of specs) if (sp.id) maps[sp.id] = buildScene(sp);
  if (specs.length) bundle.maps = maps;
  // 2. finish the quests
  let order = Math.max(0, ...Object.values(content.quests || {}).map((q) => q.order || 0));
  for (const q of qs) {
    if (!q.scene && !(q.maps || []).length) continue;
    const first = (q.maps && q.maps[0]) || q.scene?.map, m = (bundle.maps || {})[first];
    q.maps = [...new Set([...(q.maps || []), first])].filter(Boolean);
    if (m) q.scene = { map: first, x: m.spawn.x, y: m.spawn.y };
    if (!q.order) q.order = ++order;
    const prot = q.protagonist && chars.includes(q.protagonist) ? q.protagonist : (q.callers || []).find((c) => chars.includes(c)) || chars[0];
    q.protagonist = prot;
    q.cast = [...new Set([prot, ...(q.cast || []).filter((c) => chars.includes(c) || bundle.npcs?.[c])])];
    q.callers = [...new Set([prot, ...(q.callers || []).filter((c) => chars.includes(c)), ...chars])];
    q.rev = q.rev || 0;
    // moving between the story's new scenes: always arrive at that scene's entrance (the AI cannot know the layout)
    for (const st of q.steps || []) { const dest = st.type === 'teleport' && (bundle.maps || {})[st.map]; if (dest) { st.x = dest.spawn.x; st.y = dest.spawn.y; } }
  }
  return bundle;
}
