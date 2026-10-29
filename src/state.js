// Game state, saving, XP/levels, inventory, flags. Pure logic (no Phaser, no DOM) so it can be unit tested.
import { content } from './content.js';

const SAVE_KEY = 'buzaglos-save-v1';
export const xpForLevel = (lvl) => 40 + lvl * 30;   // xp needed to go from lvl to lvl+1

export function newState() {
  const cfg = content.config;
  return {
    v: 1,
    activeChar: cfg.startChar,
    map: cfg.startMap, x: cfg.startX, y: cfg.startY, dir: 0,
    coins: cfg.startCoins, xp: 0, level: 1,
    inv: {}, flags: { ...(cfg.startFlags || {}) }, quests: {}, shards: [], achievements: [], collected: {},
    owned: { outfits: [], upgrades: [] },
    equipped: {},               // charId -> outfit item id
    stats: { steps: 0, talks: 0, minigames: 0, coinsEarned: 0, abilityUses: 0, purchases: 0 },
    unlockedChars: [...cfg.startChars],
    settings: { music: true, sfx: true },
    playSeconds: 0, savedAt: 0,
  };
}

export const S = { state: newState(), started: false };
const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const SAVE_EVENTS = new Set(['coins', 'xp', 'item', 'itemLost', 'flag', 'questStarted', 'stepDone', 'questDone', 'achievement', 'levelup']);
let saveTimer = null;
export function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { if (S.started) saveGame(); }, 500); }
export const emit = (type, data) => { listeners.forEach((fn) => fn(type, data)); if (SAVE_EVENTS.has(type)) scheduleSave(); };

const slotKey = (id) => `buzaglos-save-v2:${id}`;
const LAST_KEY = 'buzaglos-last-char';
export const PREVIEW = /[?&]preview=1/.test(location.search);   // Admin Studio draft preview: nothing is saved
export function saveGame() {
  if (PREVIEW) return;
  S.state.savedAt = Date.now();
  try { localStorage.setItem(slotKey(S.state.activeChar), JSON.stringify(S.state)); localStorage.setItem(LAST_KEY, S.state.activeChar); } catch (e) { /* storage blocked */ }
}
/** Moves a pre-v2 single save into its character's slot. */
function migrateOld() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return;
    const old = JSON.parse(raw);
    if (old?.activeChar && !localStorage.getItem(slotKey(old.activeChar))) localStorage.setItem(slotKey(old.activeChar), JSON.stringify(old));
    localStorage.removeItem(SAVE_KEY);
  } catch (e) { /* ignore */ }
}
export function peekSave(id) { migrateOld(); try { const raw = localStorage.getItem(slotKey(id)); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
export const hasSave = (id) => !!peekSave(id);
export const lastChar = () => { try { return localStorage.getItem(LAST_KEY); } catch (e) { return null; } };
export function loadGame(id) {
  const saved = peekSave(id); if (!saved) return false;
  S.state = migrate(saved); return true;
}
export function clearSave(id) { try { localStorage.removeItem(slotKey(id)); } catch (e) { /* ignore */ } }
export function startNewGame(charId) { S.state = newState(); if (charId) S.state.activeChar = charId; S.state.chosen = !!charId; }
function migrate(saved) {
  const base = newState();
  const merged = { ...base, ...saved, stats: { ...base.stats, ...saved.stats }, settings: { ...base.settings, ...saved.settings }, owned: { ...base.owned, ...saved.owned } };
  if (!content.characters[merged.activeChar]) merged.activeChar = base.activeChar;
  // a quest that gained steps since the save was written: move the saved step along so progress is never lost or repeated
  for (const [qid, st] of Object.entries(merged.quests || {})) {
    const q = content.quests[qid]; if (!q || st.state !== 'active' || (st.rev || 0) >= (q.rev || 0)) continue;
    let step = st.step || 0;
    for (const sh of q.stepShifts || []) if ((st.step || 0) >= sh.at) step += sh.n;
    st.step = Math.min(step, q.steps.length - 1); st.rev = q.rev;
  }
  return merged;
}
export function exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(S.state)))); }
export function importCode(code, confirmOverwrite) {
  try { const obj = JSON.parse(decodeURIComponent(escape(atob(code.trim())))); if (!obj || obj.v !== 1) return false; if (peekSave(obj.activeChar) && confirmOverwrite && !confirmOverwrite(obj.activeChar)) return false; S.state = migrate(obj); saveGame(); return true; } catch (e) { return false; }
}

// ------------------------------------------------------------ economy
export function bonus() {
  const up = S.state.owned.upgrades.map((id) => content.items[id]).filter(Boolean);
  const sum = (k) => up.reduce((a, u) => a + (u.bonus?.[k] || 0), 0);
  return { speed: sum('speed'), coinPct: sum('coinPct'), cooldownPct: sum('cooldownPct'), xpPct: sum('xpPct') };
}
export function addCoins(n) {
  if (n > 0) n = Math.round(n * (1 + bonus().coinPct / 100));
  S.state.coins = Math.max(0, S.state.coins + n);
  if (n > 0) S.state.stats.coinsEarned += n;
  emit('coins', n); checkAchievements();
  return n;
}
export function addXp(n) {
  n = Math.round(n * (1 + bonus().xpPct / 100));
  S.state.xp += n;
  let leveled = 0;
  while (S.state.xp >= xpForLevel(S.state.level)) { S.state.xp -= xpForLevel(S.state.level); S.state.level++; leveled++; }
  emit('xp', n);
  if (leveled) emit('levelup', S.state.level);
  checkAchievements();
  return n;
}
export function addItem(id, n = 1) {
  const it = content.items[id]; if (!it) return;
  if (it.type === 'outfit') { if (!S.state.owned.outfits.includes(id)) S.state.owned.outfits.push(id); }
  else if (it.type === 'upgrade') { if (!S.state.owned.upgrades.includes(id)) S.state.owned.upgrades.push(id); }
  else if (it.type === 'character') { if (!S.state.unlockedChars.includes(it.character)) { S.state.unlockedChars.push(it.character); emit('charUnlocked', it.character); } }
  else S.state.inv[id] = (S.state.inv[id] || 0) + n;
  emit('item', { id, n }); checkAchievements();
}
export const itemCount = (id) => S.state.inv[id] || 0;
export function removeItem(id, n = 1) {
  if (itemCount(id) < n) return false;
  S.state.inv[id] -= n; if (S.state.inv[id] <= 0) delete S.state.inv[id];
  emit('itemLost', { id, n }); return true;
}
export function setFlag(key, value = true) { S.state.flags[key] = value; emit('flag', key); checkAchievements(); }
export const getFlag = (key) => S.state.flags[key];

export function equippedLook(charId) {
  const base = content.characters[charId]?.look || {};
  const outfit = content.items[S.state.equipped[charId]];
  return outfit ? { ...base, ...outfit.look } : base;
}

export function buy(itemId) {
  const it = content.items[itemId];
  if (!it || it.price == null) return { ok: false, code: 'notForSale' };
  if ((it.type === 'outfit' && S.state.owned.outfits.includes(itemId)) || (it.type === 'upgrade' && S.state.owned.upgrades.includes(itemId)) || (it.type === 'character' && S.state.unlockedChars.includes(it.character)))
    return { ok: false, code: 'owned' };
  if (S.state.coins < it.price) return { ok: false, code: 'noCoins' };
  S.state.coins -= it.price;
  S.state.stats.purchases++;
  addItem(itemId, 1);
  emit('coins', -it.price);
  return { ok: true, code: 'bought' };
}

// ------------------------------------------------------------ conditions (used by dialogue, quests, shop)
export function check(cond) {
  if (!cond) return true;
  if (Array.isArray(cond)) return cond.every(check);
  if (cond.flag && !S.state.flags[cond.flag]) return false;
  if (cond.noFlag && S.state.flags[cond.noFlag]) return false;
  if (cond.char && S.state.activeChar !== cond.char) return false;
  if (cond.item && itemCount(cond.item) < (cond.n || 1)) return false;
  if (cond.quest) {
    const q = S.state.quests[cond.quest];
    const want = cond.state || 'done';
    if (want === 'done' && q?.state !== 'done') return false;
    if (want === 'active' && q?.state !== 'active') return false;
    if (want === 'none' && q) return false;
  }
  if (cond.shards != null && S.state.shards.length < cond.shards) return false;
  if (cond.level != null && S.state.level < cond.level) return false;
  if (cond.coins != null && S.state.coins < cond.coins) return false;
  return true;
}

// ------------------------------------------------------------ achievements
export function checkAchievements() {
  for (const a of Object.values(content.achievements)) {
    if (S.state.achievements.includes(a.id)) continue;
    const c = a.cond || {}; let ok = false;
    switch (c.type) {
      case 'coins': ok = S.state.stats.coinsEarned >= c.n; break;
      case 'shards': ok = S.state.shards.length >= c.n; break;
      case 'quests': ok = Object.values(S.state.quests).filter((q) => q.state === 'done').length >= c.n; break;
      case 'level': ok = S.state.level >= c.n; break;
      case 'flag': ok = !!S.state.flags[c.key]; break;
      case 'steps': ok = S.state.stats.steps >= c.n; break;
      case 'purchases': ok = S.state.stats.purchases >= c.n; break;
      case 'minigames': ok = S.state.stats.minigames >= c.n; break;
      case 'abilities': ok = S.state.stats.abilityUses >= c.n; break;
      case 'chars': ok = S.state.unlockedChars.length >= c.n; break;
      default: ok = false;
    }
    if (ok) { S.state.achievements.push(a.id); if (a.reward?.coins) { S.state.coins += a.reward.coins; } emit('achievement', a); }
  }
}

// ------------------------------------------------------------ cloud saves (optional; needs content.config.apiUrl)
export const cloudEnabled = () => !PREVIEW && !!content.config.apiUrl;
const cloudUrl = (code) => `${content.config.apiUrl.replace(/\/$/, '')}/api/save/${encodeURIComponent(code)}`;
export const validCode = (code) => /^[A-Za-z0-9_-]{8,40}$/.test(code || '');
export async function cloudSave(code) {
  if (!cloudEnabled() || !validCode(code)) return false;
  S.state.savedAt = Date.now();
  const r = await fetch(cloudUrl(code), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(S.state) });
  return r.ok;
}
export async function cloudLoad(code) {
  if (!cloudEnabled() || !validCode(code)) return false;
  const r = await fetch(cloudUrl(code)); if (!r.ok) return false;
  const obj = await r.json(); if (!obj || obj.v !== 1) return false;
  S.state = migrate(obj); saveGame(); return true;
}
