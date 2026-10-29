// Auto-placement of new story content (NPCs, collectables) on the hub map, so a generated quest is playable the moment it is approved.
// Pure: mutates the content object it is given.
const SOLID = new Set(['wall', 'wallface', 'water', 'fence', 'roof', 'void', 'pool', 'kotel']);

function freeTiles(map) {
  const H = map.tiles.length, W = map.tiles[0].length;
  const used = new Set();
  for (const p of map.props || []) for (let dx = -1; dx <= 2; dx++) for (let dy = -2; dy <= 1; dy++) used.add((p.x + dx) + ',' + (p.y + dy));
  for (const n of map.npcs || []) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) used.add((n.x + dx) + ',' + (n.y + dy));
  for (const p of map.pickups || []) used.add(p.x + ',' + p.y);
  const out = [];
  for (let y = 2; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (SOLID.has(map.legend[map.tiles[y][x]])) continue;
    if (used.has(x + ',' + y)) continue;
    if ((map.doors || []).some((d) => Math.hypot(d.x - x, d.y - y) < 3)) continue;
    out.push({ x, y });
  }
  return out;
}

const onAnyMap = (content, id) => Object.values(content.maps).some((m) => (m.npcs || []).some((n) => n.id === id));

/**
 * @param content   full content object (already merged with the bundle)
 * @param bundle    the AI bundle (quests / npcs ...)
 * @param opts.near {x,y} if given, the quest givers are put close to this point (preview start)
 * @param opts.questIds restrict to these quests (default: all quests of the bundle)
 */
export function placeBundle(content, bundle, opts = {}) {
  const hubId = content.config?.hub?.map || 'house';
  const map = content.maps[hubId]; if (!map) return;
  map.npcs ||= []; map.pickups ||= [];
  let free = freeTiles(map);
  const take = (near) => {
    let pool = free;
    if (near) { const close = free.filter((t) => { const d = Math.hypot(t.x - near.x, t.y - near.y); return d >= 3 && d <= 7; }); if (close.length) pool = close; }
    if (!pool.length) return null;
    const t = pool[Math.floor(Math.random() * pool.length)];
    free = free.filter((f) => Math.hypot(f.x - t.x, f.y - t.y) >= 2);
    return t;
  };
  const quests = Object.values(bundle.quests || {}).filter((q) => !opts.questIds || opts.questIds.includes(q.id));
  // givers first (close to the start in preview), then every other new NPC
  const givers = new Set(quests.map((q) => q.giver).filter(Boolean));
  const newNpcs = Object.keys(bundle.npcs || {});
  for (const id of [...givers, ...newNpcs.filter((n) => !givers.has(n))]) {
    if (!content.npcs[id]) continue;
    const isGiver = givers.has(id);
    if (!opts.near && onAnyMap(content, id)) continue;
    if (opts.near && isGiver && (map.npcs || []).some((n) => n.id === id)) continue;
    if (opts.near && !isGiver && onAnyMap(content, id)) continue;
    const t = take(isGiver ? opts.near : null); if (!t) continue;
    map.npcs.push({ id, x: t.x, y: t.y, dir: 0 });
  }
  // things to collect
  for (const q of quests) for (const s of q.steps || []) {
    if (s.type !== 'collect' || !content.items[s.item]) continue;
    const has = Object.values(content.maps).some((m) => (m.pickups || []).some((p) => p.needsQuest === q.id && p.item === s.item));
    if (has) continue;
    for (let i = 0; i < (s.count || 1); i++) {
      const t = take(null); if (!t) break;
      map.pickups.push({ id: `${q.id}_${s.item}_${i}`, item: s.item, x: t.x, y: t.y, hidden: false, needsQuest: q.id });
    }
  }
}
