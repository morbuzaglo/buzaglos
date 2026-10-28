// BUZAGLOS Admin Studio (Hebrew, RTL, mobile friendly).
// Edits a DRAFT copy of /content in the browser. AI generation, photo analysis and publishing go through the
// secure Worker (no keys or passwords live in this page). Without a Worker it still works in local mode:
// edit, validate, and download the JSON files to commit by hand.
import { content as bundled } from '../content.js';
import { validateContent, mergeBundle, HAIR_STYLES, ACCESSORIES, ABILITIES, ICONS, MINIGAMES } from '../shared/validate.js';
import { drawCharFrame, DEFAULT_LOOK, makeCanvas, tileAtlasCanvas, renderMapCanvas, propCanvas, TILE } from '../art.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
const DRAFT_KEY = 'bz-admin-draft-v1', SESSION_KEY = 'bz-admin-session-v1';
const FILES = ['config', 'characters', 'npcs', 'items', 'quests', 'dialogues', 'maps', 'shop', 'achievements'];
const HE = { mordechai: '', };
let original = clone(bundled);
let draft = (() => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || clone(bundled); } catch { return clone(bundled); } })();
let session = (() => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {}; } catch { return {}; } })();
let tab = 'family', sel = { kind: 'characters', id: null }, mapSel = 'house', gen = null, placing = null, busy = '';
const app = document.getElementById('app');

// NPC twins of playable characters (npc.character) always mirror the character's name and look
function syncTwins() { for (const n of Object.values(draft.npcs)) { const c = n.character && draft.characters[n.character]; if (c) { n.name = c.name; n.look = JSON.parse(JSON.stringify(c.look)); } } }
const saveDraft = () => { syncTwins(); try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* quota */ } };
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
const api = async (path, body, method) => {
  if (!session.apiUrl) throw new Error('לא מחוברים לשרת (מצב מקומי)');
  const r = await fetch(session.apiUrl.replace(/\/$/, '') + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(session.token ? { authorization: 'Bearer ' + session.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(data.error || `שגיאה ${r.status}`); e.details = data.details; throw e; }
  return data;
};
const toast = (msg, cls = 'ok') => { const t = h('div', { class: 'card ' + cls, style: 'position:fixed;bottom:14px;left:14px;right:14px;z-index:99;text-align:center;font-weight:700' }, msg); document.body.append(t); setTimeout(() => t.remove(), 3200); };
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// ---------------------------------------------------------------- shell
function render() {
  app.innerHTML = '';
  app.append(h('h1', {}, 'סטודיו הניהול של בוזגלו'), h('div', { class: 'sub' }, session.token ? `מחובר לשרת ✓  (${session.apiUrl})` : 'מצב מקומי: עריכה, בדיקה והורדת קבצים. כדי להשתמש ב-AI ובפרסום אוטומטי, התחברו לשרת.'));
  if (!session.token) app.append(loginCard()); else app.append(h('button', { class: 'btn gray', onclick: () => { session = {}; sessionStorage.removeItem(SESSION_KEY); render(); } }, 'התנתקות'));
  const tabs = h('div', { class: 'tabs' });
  [['family', 'משפחה'], ['stories', 'סיפורים (AI)'], ['economy', 'כלכלה'], ['maps', 'מפות'], ['publish', 'פרסום']].forEach(([k, l]) => tabs.append(h('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => { tab = k; render(); } }, l)));
  app.append(tabs);
  ({ family: tabFamily, stories: tabStories, economy: tabEconomy, maps: tabMaps, publish: tabPublish })[tab]();
}

function loginCard() {
  const url = h('input', { type: 'url', placeholder: 'https://buzaglos-api.<account>.workers.dev', value: session.apiUrl || localStorage.getItem('bz-admin-api') || '' });
  const pw = h('input', { type: 'password', placeholder: 'סיסמת מנהל', autocomplete: 'current-password' });
  const go = async () => {
    try {
      localStorage.setItem('bz-admin-api', url.value);
      const r = await fetch(url.value.replace(/\/$/, '') + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw.value }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'שגיאת התחברות');
      session = { apiUrl: url.value, token: d.token }; sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      try { const c = await api('/api/admin/content'); const live = {}; for (const [n, t] of Object.entries(c.files)) live[n.replace('.json', '')] = JSON.parse(t); original = { ...clone(bundled), ...live }; if (JSON.stringify(draft) === JSON.stringify(bundled)) { draft = clone(original); saveDraft(); } } catch (e) { toast('התחברנו, אך קריאת התוכן מהמאגר נכשלה: ' + e.message, 'warn'); }
      render();
    } catch (e) { toast(e.message, 'bad'); }
  };
  return h('div', { class: 'card' }, h('h3', {}, 'התחברות לשרת'), h('label', {}, 'כתובת השרת (Worker)'), url, h('label', {}, 'סיסמה'), pw, h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn', onclick: go }, 'כניסה')));
}

// ---------------------------------------------------------------- family
function lookCanvas(look, scale = 8) {
  const [c, ctx] = makeCanvas(16 * 4, 20); drawCharFrame(ctx, 0, 0, 0, 0, look); drawCharFrame(ctx, 16, 0, 2, 0, look); drawCharFrame(ctx, 32, 0, 1, 0, look); drawCharFrame(ctx, 48, 0, 3, 0, look);
  c.className = 'px'; c.style.width = c.width * scale / 2 + 'px'; c.style.height = c.height * scale / 2 + 'px'; return c;
}
function tabFamily() {
  const list = h('div', { class: 'card' }, h('h3', {}, 'בני משפחה (גיבורים)'));
  const chips = h('div', { class: 'chips' });
  for (const [id, c] of Object.entries(draft.characters)) chips.append(h('span', { class: 'chip' + (sel.kind === 'characters' && sel.id === id ? ' on' : ''), onclick: () => { sel = { kind: 'characters', id }; render(); } }, c.name));
  chips.append(h('span', { class: 'chip', onclick: () => addPerson('characters') }, '+ בן משפחה'));
  list.append(chips, h('h3', {}, 'קרובים וחברים (דמויות משנה)'));
  const chips2 = h('div', { class: 'chips' });
  for (const [id, c] of Object.entries(draft.npcs)) chips2.append(h('span', { class: 'chip' + (sel.kind === 'npcs' && sel.id === id ? ' on' : ''), onclick: () => { sel = { kind: 'npcs', id }; render(); } }, c.name));
  chips2.append(h('span', { class: 'chip', onclick: () => addPerson('npcs') }, '+ קרוב/חבר'));
  list.append(chips2); app.append(list);
  if (sel.id && draft[sel.kind][sel.id]) app.append(personEditor(sel.kind, sel.id));
}
function addPerson(kind) {
  const name = prompt('שם (בעברית):'); if (!name) return;
  const id = prompt('מזהה באנגלית (אותיות קטנות, למשל: dana):', slug(name)); if (!id || !/^[a-z][a-z0-9_]{1,40}$/.test(id)) return toast('מזהה לא תקין', 'bad');
  if (draft[kind][id]) return toast('המזהה כבר קיים', 'bad');
  const base = { name, role: kind === 'npcs' ? 'קרוב משפחה' : 'בן משפחה', look: { ...DEFAULT_LOOK }, placeholder: true };
  draft[kind][id] = kind === 'characters' ? { ...base, gender: 'f', bio: '', ability: { type: 'dash', name: 'ספרינט', desc: 'פרץ של מהירות.', cooldown: 5 }, strength: '', weakness: '', catchphrase: '', theme: '#3a7bd5' } : { ...base, id, dialogues: [{ id: id + '_default' }] };
  if (kind === 'npcs') draft.dialogues[id + '_default'] = { start: { who: id, text: 'שלום!', next: null } };
  if (kind === 'characters') draft.config.startChars.push(id);
  sel = { kind, id }; saveDraft(); render();
}
function personEditor(kind, id) {
  const p = draft[kind][id]; const isChar = kind === 'characters';
  const card = h('div', { class: 'card' }, h('h3', {}, `עריכה: ${p.name}`));
  const field = (label, key, type = 'text', obj = p) => { const i = type === 'area' ? h('textarea', {}, obj[key] || '') : h('input', { type, value: obj[key] ?? '' }); i.addEventListener('change', () => { obj[key] = type === 'number' ? +i.value : i.value; saveDraft(); }); return h('div', {}, h('label', {}, label), i); };
  const sct = (label, key, opts, obj = p, onch) => { const s = h('select', {}, opts.map((o) => h('option', { value: o[0] ?? o, selected: (obj[key] ?? '') === (o[0] ?? o) }, o[1] ?? o))); s.addEventListener('change', () => { obj[key] = s.value === '' ? undefined : s.value; saveDraft(); if (onch) onch(); }); return h('div', {}, h('label', {}, label), s); };
  card.append(h('div', { class: 'grid2' }, field('שם', 'name'), field('תפקיד', 'role'), isChar ? sct('מגדר (לניסוח בעברית)', 'gender', [['f', 'נקבה'], ['m', 'זכר']]) : h('div'), field('מאפיין / קשר משפחתי', 'relations')));
  if (isChar) card.append(field('תיאור / אישיות', 'bio', 'area'), h('div', { class: 'grid2' }, field('חוזקה', 'strength'), field('חולשה', 'weakness')), field('משפט מזהה', 'catchphrase'),
    h('h3', {}, 'יכולת מיוחדת (כפתור B)'), h('div', { class: 'grid2' }, sct('סוג', 'type', [['dash', 'ריצה מהירה'], ['sniff', 'גילוי חפצים נסתרים'], ['charm', 'קסם אישי (טיפ מדמויות)'], ['fix', 'תיקון חפצים']], p.ability), field('שם היכולת', 'name', 'text', p.ability), field('תיאור', 'desc', 'text', p.ability), field('זמן טעינה (שניות)', 'cooldown', 'number', p.ability)));
  // look
  const prev = h('div', { id: 'lookPrev' }, lookCanvas(p.look));
  const upd = () => { prev.innerHTML = ''; prev.append(lookCanvas(p.look)); saveDraft(); };
  const color = (label, key) => { const i = h('input', { type: 'color', value: p.look[key] || '#000000' }); i.addEventListener('input', () => { p.look[key] = i.value; upd(); }); return h('div', {}, h('label', {}, label), i); };
  const hatOn = h('input', { type: 'checkbox', checked: !!p.look.hat }); hatOn.addEventListener('change', () => { p.look.hat = hatOn.checked ? (p.look.hat || '#e84b4b') : null; upd(); render(); });
  card.append(h('h3', {}, 'מראה (פיקסלים)'), prev, h('div', { class: 'grid4' }, color('עור', 'skin'), color('שיער', 'hair'), color('חולצה', 'shirt'), color('מכנסיים', 'pants')),
    h('div', { class: 'grid4' }, sct('סגנון שיער', 'hairStyle', HAIR_STYLES.map((x) => [x, { short: 'קצר', long: 'ארוך', curly: 'מתולתל', bun: 'אסוף', bald: 'קירח' }[x]]), p.look, upd), sct('אביזר', 'accessory', ACCESSORIES.map((x) => [x, { none: 'ללא', glasses: 'משקפיים', beard: 'זקן', both: 'משקפיים וזקן' }[x]]), p.look, upd), h('div', {}, h('label', {}, 'כובע'), hatOn), p.look.hat ? color('צבע כובע', 'hat') : h('div')));
  // photo -> look
  const file = h('input', { type: 'file', accept: 'image/*' });
  const btn = h('button', { class: 'btn alt', onclick: async () => {
    if (!file.files[0]) return toast('בחרו תמונה קודם', 'warn');
    try { btn.disabled = true; btn.textContent = 'מנתח...'; const img = await resizeImage(file.files[0]); const r = await api('/api/admin/vision', { image: img }); Object.assign(p.look, DEFAULT_LOOK, r.look); if (!p.look.hat) delete p.look.hat; if (r.notes) p.photoNotes = r.notes; saveDraft(); toast('המראה נוצר מהתמונה. אפשר לערוך אותו ידנית.'); render(); } catch (e) { toast(e.message, 'bad'); } finally { btn.disabled = false; btn.textContent = 'יצירת מראה מהתמונה'; } } }, 'יצירת מראה מהתמונה');
  card.append(h('h3', {}, 'תמונה'), h('div', { class: 'sub' }, 'התמונה נשלחת לניתוח בלבד ואינה נשמרת ואינה מתפרסמת במשחק. מתקבלת דמות מסוגננת לפי מאפיינים (שיער, עור, משקפיים...), ואפשר לתקן אותה.'), file, h('div', { style: 'margin-top:8px' }, btn), p.photoNotes ? h('div', { class: 'sub' }, 'מהתמונה: ' + p.photoNotes) : null);
  card.append(h('div', { class: 'row', style: 'margin-top:14px' }, isChar ? null : h('button', { class: 'btn red', onclick: () => { if (confirm('למחוק את ' + p.name + '?')) { delete draft[kind][id]; sel = { kind, id: null }; saveDraft(); render(); } } }, 'מחיקה')));
  return card;
}
async function resizeImage(file) {
  const url = URL.createObjectURL(file); const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const s = Math.min(1, 768 / Math.max(img.width, img.height)); const [c, ctx] = makeCanvas(Math.round(img.width * s), Math.round(img.height * s));
  ctx.imageSmoothingEnabled = true; ctx.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); return c.toDataURL('image/jpeg', 0.85);
}

// ---------------------------------------------------------------- stories
function storyContext() {
  return {
    characters: Object.fromEntries(Object.entries(draft.characters).map(([id, c]) => [id, { name: c.name, role: c.role, gender: c.gender, relations: c.relations || '' }])),
    npcs: Object.fromEntries(Object.entries(draft.npcs).map(([id, n]) => [id, { name: n.name, role: n.role }])),
    maps: Object.fromEntries(Object.entries(draft.maps).map(([id, m]) => [id, { name: m.name, props: (m.props || []).filter((p) => p.id).map((p) => p.id) }])),
    items: Object.fromEntries(Object.entries(draft.items).map(([id, i]) => [id, { name: i.name, type: i.type }])),
    existingQuestIds: Object.keys(draft.quests),
  };
}
function questCard(q) {
  return h('div', { class: 'quest' }, h('b', {}, q.title), h('div', { class: 'sub' }, `נותן המשימה: ${draft.npcs[q.giver]?.name || q.giver}  |  שלבים: ${(q.steps || []).length}  |  פרס: ${q.reward?.coins || 0} מטבעות, ${q.reward?.xp || 0} ניסיון${q.reward?.shard ? '  |  רסיס: ' + q.reward.shard.title : ''}`),
    h('ol', {}, (q.steps || []).map((s) => h('li', {}, `${s.text} `, h('span', { class: 'sub' }, `[${s.type}${s.game ? ':' + s.game : ''}]`)))),
    q.reward?.shard ? h('div', { class: 'sub' }, '״' + q.reward.shard.story + '״') : null);
}
function tabStories() {
  const story = h('textarea', { placeholder: 'ספרו מה קרה: מי היה שם, איפה, מה היה מצחיק... אפשר בעברית חופשית, גם בכמה משפטים.', style: 'min-height:140px' }, gen?.storyText || '');
  const who = h('div', { class: 'chips' }); const picked = new Set(gen?.picked || []);
  for (const [id, c] of Object.entries(draft.characters)) who.append(h('span', { class: 'chip' + (picked.has(id) ? ' on' : ''), onclick: (e) => { picked.has(id) ? picked.delete(id) : picked.add(id); e.target.classList.toggle('on'); gen = { ...(gen || {}), picked: [...picked] }; } }, c.name));
  const go = h('button', { class: 'btn', onclick: async () => {
    if (story.value.trim().length < 20) return toast('כתבו קצת יותר על הסיפור', 'warn');
    try { go.disabled = true; go.textContent = 'ה-AI כותב...'; const names = [...picked].map((id) => draft.characters[id].name).join(', ');
      const r = await api('/api/admin/generate', { story: (names ? `משתתפים: ${names}\n` : '') + story.value, context: storyContext() });
      gen = { storyText: story.value, picked: [...picked], bundleText: JSON.stringify(r.bundle, null, 1), errors: r.errors, warnings: r.warnings, conflicts: r.conflicts }; render();
    } catch (e) { toast(e.message, 'bad'); go.disabled = false; go.textContent = 'יצירה עם AI'; } } }, 'יצירה עם AI');
  app.append(h('div', { class: 'card' }, h('h3', {}, 'מספרים סיפור, ה-AI הופך אותו למשימה'), story, h('label', {}, 'מי מעורב בסיפור?'), who, h('div', { class: 'row', style: 'margin-top:10px' }, go, session.token ? null : h('span', { class: 'sub' }, 'נדרש חיבור לשרת. בלי שרת: הדביקו למטה JSON שנוצר בכלי אחר.'))));
  const area = h('textarea', { class: 'code', placeholder: '{ "quests": { ... }, "dialogues": {...}, "npcs": {...}, "items": {...} }' }, gen?.bundleText || '');
  const result = h('div');
  const check = () => {
    result.innerHTML = '';
    let bundle; try { bundle = JSON.parse(area.value); } catch (e) { result.append(h('div', { class: 'err-list' }, 'JSON לא תקין: ' + e.message)); return null; }
    const m = mergeBundle(draft, bundle); const v = validateContent(m.content);
    if (bundle.notes) result.append(h('div', { class: 'card warn' }, 'הערות מה-AI: ' + (Array.isArray(bundle.notes) ? bundle.notes.join(' | ') : bundle.notes)));
    if (m.conflicts.length) result.append(h('div', { class: 'warn-list' }, 'מזהים שכבר קיימים (לא יידרסו): ' + m.conflicts.join(', ')));
    if (v.errors.length) result.append(h('div', { class: 'err-list' }, h('b', {}, 'שגיאות (חובה לתקן):'), h('ul', {}, v.errors.map((e) => h('li', {}, e)))));
    if (v.warnings.length) result.append(h('div', { class: 'warn-list' }, h('ul', {}, v.warnings.map((e) => h('li', {}, e)))));
    if (!v.errors.length) result.append(h('div', { class: 'ok' }, '✓ התוכן תקין.'));
    for (const q of Object.values(bundle.quests || {})) result.append(questCard(q));
    for (const n of Object.values(bundle.npcs || {})) result.append(h('div', { class: 'row' }, lookCanvas(n.look, 4), h('b', {}, n.name), h('span', { class: 'sub' }, n.role || '')));
    return { bundle, m, v };
  };
  const add = h('button', { class: 'btn', onclick: () => { const r = check(); if (!r || r.v.errors.length) return toast('אי אפשר להוסיף לפני תיקון השגיאות', 'bad'); draft = r.m.content; saveDraft(); gen = null; toast('התוכן נוסף לטיוטה. אפשר לפרסם בלשונית פרסום.'); render(); } }, 'אישור והוספה לטיוטה');
  app.append(h('div', { class: 'card' }, h('h3', {}, 'תצוגה מקדימה ועריכה'), h('div', { class: 'sub' }, 'אפשר לערוך את ה-JSON ישירות לפני האישור.'), area, h('div', { class: 'row', style: 'margin:8px 0' }, h('button', { class: 'btn alt', onclick: check }, 'בדיקה'), add), result));
  if (area.value) check();
}

// ---------------------------------------------------------------- economy
function tabEconomy() {
  const cfg = draft.config; const num = (obj, k) => { const i = h('input', { type: 'number', value: obj[k] ?? 0 }); i.addEventListener('change', () => { obj[k] = +i.value; saveDraft(); }); return i; };
  app.append(h('div', { class: 'card' }, h('h3', {}, 'הגדרות כלליות'), h('div', { class: 'grid2' }, h('div', {}, h('label', {}, 'מטבעות התחלתיים'), num(cfg, 'startCoins')), h('div', {}, h('label', {}, 'מספר רסיסים לסיום המשחק'), num(cfg, 'finalShards')))));
  const rows = Object.values(draft.quests).map((q) => h('tr', {}, h('td', {}, q.title), h('td', {}, q.reward ? num(q.reward, 'coins') : '-'), h('td', {}, q.reward ? num(q.reward, 'xp') : '-')));
  app.append(h('div', { class: 'card' }, h('h3', {}, 'פרסי משימות'), h('table', {}, h('tr', {}, h('th', {}, 'משימה'), h('th', {}, 'מטבעות'), h('th', {}, 'ניסיון')), rows)));
  const irows = Object.values(draft.items).map((it) => h('tr', {}, h('td', {}, it.name), h('td', { class: 'sub' }, it.type), h('td', {}, it.price != null || it.type === 'outfit' || it.type === 'upgrade' || it.type === 'consumable' ? num(it, 'price') : '-'), h('td', {}, ...Object.keys(it.bonus || {}).map((k) => h('div', { class: 'row' }, h('span', { class: 'sub' }, k), num(it.bonus, k))))));
  app.append(h('div', { class: 'card' }, h('h3', {}, 'פריטים ומחירים'), h('table', {}, h('tr', {}, h('th', {}, 'פריט'), h('th', {}, 'סוג'), h('th', {}, 'מחיר'), h('th', {}, 'בונוס')), irows)));
  for (const [sid, list] of Object.entries(draft.shop)) {
    const chips = h('div', { class: 'chips' });
    for (const [id, it] of Object.entries(draft.items)) if (it.price != null) chips.append(h('span', { class: 'chip' + (list.includes(id) ? ' on' : ''), onclick: (e) => { const i = list.indexOf(id); i >= 0 ? list.splice(i, 1) : list.push(id); e.target.classList.toggle('on'); saveDraft(); } }, it.name));
    app.append(h('div', { class: 'card' }, h('h3', {}, `חנות: ${draft.npcs[sid]?.name || sid}`), chips));
  }
}

// ---------------------------------------------------------------- maps
function tabMaps() {
  const sel2 = h('select', {}, Object.entries(draft.maps).map(([id, m]) => h('option', { value: id, selected: id === mapSel }, m.name))); sel2.addEventListener('change', () => { mapSel = sel2.value; render(); });
  const m = draft.maps[mapSel];
  const atlas = tileAtlasCanvas(); const base = renderMapCanvas(m, atlas); const S = 2;
  const [cv, ctx] = makeCanvas(base.width * S, base.height * S); ctx.imageSmoothingEnabled = false; ctx.drawImage(base, 0, 0, cv.width, cv.height);
  for (const p of m.props || []) { const pc = propCanvas(p.type); if (pc) ctx.drawImage(pc, p.x * TILE * S, (p.y + 1) * TILE * S - pc.height * S, pc.width * S, pc.height * S); }
  for (const n of m.npcs || []) { const d = draft.npcs[n.id]; if (!d) continue; const [t, tc] = makeCanvas(16, 20); drawCharFrame(tc, 0, 0, 0, 0, d.look); ctx.drawImage(t, n.x * TILE * S, (n.y + 1) * TILE * S - 20 * S + 1, 16 * S, 20 * S); }
  ctx.strokeStyle = 'rgba(255,210,63,.9)'; ctx.lineWidth = 2; for (const d of m.doors || []) ctx.strokeRect(d.x * TILE * S + 1, d.y * TILE * S + 1, TILE * S - 2, TILE * S - 2);
  for (const p of m.pickups || []) { ctx.fillStyle = 'rgba(123,224,255,.9)'; ctx.fillRect(p.x * TILE * S + 10, p.y * TILE * S + 10, 12, 12); }
  const info = h('div', { class: 'sub' }, placing ? `לחצו על המפה כדי להציב את ${draft.npcs[placing].name}` : 'צהוב = דלתות, כחול = פריטים לאיסוף');
  cv.addEventListener('click', (e) => { if (!placing) return; const r = cv.getBoundingClientRect(); const x = Math.floor(((e.clientX - r.left) / r.width) * m.tiles[0].length), y = Math.floor(((e.clientY - r.top) / r.height) * m.tiles.length);
    m.npcs = (m.npcs || []).filter((n) => n.id !== placing); m.npcs.push({ id: placing, x, y, dir: 0 }); placing = null; saveDraft(); render(); });
  const npcSel = h('select', {}, Object.entries(draft.npcs).map(([id, n]) => h('option', { value: id }, n.name)));
  app.append(h('div', { class: 'card' }, h('h3', {}, 'מפה'), sel2, h('div', { style: 'margin:8px 0' }, info), h('div', { class: 'mapwrap' }, cv),
    h('h3', {}, 'דמויות במפה'), h('div', { class: 'chips' }, (m.npcs || []).map((n) => h('span', { class: 'chip', onclick: () => { if (confirm('להסיר את ' + draft.npcs[n.id]?.name + ' מהמפה?')) { m.npcs = m.npcs.filter((x) => x !== n); saveDraft(); render(); } } }, `${draft.npcs[n.id]?.name || n.id} (${n.x},${n.y}) ✕`))),
    h('div', { class: 'row', style: 'margin-top:8px' }, npcSel, h('button', { class: 'btn alt', onclick: () => { placing = npcSel.value; render(); } }, 'הצבה על המפה'))));
  const tiles = h('textarea', { class: 'code', style: 'min-height:220px' }, m.tiles.join('\n'));
  const objs = h('textarea', { class: 'code', style: 'min-height:220px' }, JSON.stringify({ legend: m.legend, props: m.props, doors: m.doors, pickups: m.pickups }, null, 1));
  app.append(h('div', { class: 'card' }, h('h3', {}, 'עריכה מתקדמת'), h('div', { class: 'sub' }, 'שורות האריחים (כל תו = אריח, לפי המקרא), ואובייקטים: props / doors / pickups. אחרי עריכה לחצו "החלה".'), h('label', {}, 'אריחים'), tiles, h('label', {}, 'מקרא ואובייקטים (JSON)'), objs,
    h('div', { style: 'margin-top:8px' }, h('button', { class: 'btn', onclick: () => { try { const o = JSON.parse(objs.value); const t = tiles.value.split('\n').map((s) => s.replace(/\r/g, '')).filter(Boolean); const test = clone(draft); Object.assign(test.maps[mapSel], { tiles: t, legend: o.legend, props: o.props, doors: o.doors, pickups: o.pickups }); const v = validateContent(test); const mine = v.errors.filter((e) => e.includes('מפה ' + mapSel)); if (mine.length) return toast(mine[0], 'bad'); draft = test; saveDraft(); toast('המפה עודכנה'); render(); } catch (e) { toast(e.message, 'bad'); } } }, 'החלה'))));
}

// ---------------------------------------------------------------- publish
function changedFiles() { return FILES.filter((f) => JSON.stringify(draft[f]) !== JSON.stringify(original[f])); }
function download(name, text) { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name }); document.body.append(a); a.click(); a.remove(); }
function tabPublish() {
  const v = validateContent(draft); const changed = changedFiles();
  app.append(h('div', { class: 'card' }, h('h3', {}, 'בדיקת תקינות'),
    v.errors.length ? h('div', { class: 'err-list' }, h('ul', {}, v.errors.map((e) => h('li', {}, e)))) : h('div', { class: 'ok' }, '✓ אין שגיאות. אפשר לפרסם.'),
    v.warnings.length ? h('div', { class: 'warn-list' }, h('ul', {}, v.warnings.map((e) => h('li', {}, e)))) : null));
  app.append(h('div', { class: 'card' }, h('h3', {}, 'קבצים ששונו'), changed.length ? h('ul', {}, changed.map((f) => h('li', {}, f + '.json'))) : h('div', { class: 'sub' }, 'אין שינויים לעומת הגרסה המפורסמת.')));
  const pub = h('button', { class: 'btn', disabled: !session.token || !!v.errors.length || !changed.length, onclick: async () => {
    if (!confirm(`לפרסם ${changed.length} קבצים למשחק? המשחק יתעדכן תוך דקה-שתיים.`)) return;
    try { pub.disabled = true; pub.textContent = 'מפרסם...'; const files = {}; for (const f of changed) files[f + '.json'] = JSON.stringify(draft[f]); const r = await api('/api/admin/publish', { files, message: 'Admin Studio: ' + changed.join(', ') });
      original = { ...original, ...clone(Object.fromEntries(changed.map((f) => [f, draft[f]]))) }; toast('פורסם! עודכנו: ' + (r.published.join(', ') || 'ללא שינוי')); render(); }
    catch (e) { toast(e.message + (e.details ? ' - ' + e.details.slice(0, 3).join('; ') : ''), 'bad'); pub.disabled = false; pub.textContent = 'פרסום למשחק'; } } }, 'פרסום למשחק');
  app.append(h('div', { class: 'card' }, h('h3', {}, 'פרסום'), h('div', { class: 'row' }, pub, h('button', { class: 'btn alt', onclick: () => changed.forEach((f) => download(f + '.json', JSON.stringify(draft[f], null, 1) + '\n')) }, 'הורדת הקבצים ששונו'),
    h('button', { class: 'btn red', onclick: () => { if (confirm('לאפס את הטיוטה לגרסה המפורסמת? שינויים שלא פורסמו יאבדו.')) { draft = clone(original); saveDraft(); render(); } } }, 'איפוס טיוטה')),
    session.token ? null : h('div', { class: 'sub', style: 'margin-top:8px' }, 'במצב מקומי: מורידים את הקבצים ומעתיקים אותם לתיקיית content במאגר, ואז דוחפים ל-GitHub.')));
}

render();
