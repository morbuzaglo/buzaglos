// DOM user interface (Hebrew, right-to-left): HUD, dialogue, menus, shop, title and ending.
import { content } from '../content.js';
import {
  S, onChange, saveGame, equippedLook, buy, check, addCoins, addXp, addItem, removeItem, setFlag, getFlag,
  xpForLevel, exportCode, importCode, startNewGame, hasSave, loadGame, cloudEnabled, cloudSave, cloudLoad, validCode, peekSave, clearSave, lastChar,
  cloudAutoOn, syncSlotFromCloud, syncAllFromCloud,
} from '../state.js';
import { paintPortrait, paintIcon, paintTitleBanner } from '../art.js';
import * as Q from '../systems/quests.js';
import { sfx, setMusic, setSfx, audioSettings } from '../audio.js';
import { STR, tpl } from '../i18n.js';

export const hooks = { enterStory: null, teleport: null, ending: null, charChanged: null, resetCooldown: null, newGame: null, continueGame: null, toTitle: null };
const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const T = (s) => esc(tpl(s));

// ------------------------------------------------------------------ toast
let toastTimer = null;
export function toast(msg, ms = 2000) {
  const t = $('toast'); t.textContent = tpl(msg); t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
const toastQueue = [];
let toastBusy = false;
export function queueToast(msg, ms = 1800) { toastQueue.push([msg, ms]); pump(); }
function pump() { if (toastBusy || !toastQueue.length) return; toastBusy = true; const [m, ms] = toastQueue.shift(); toast(m, ms); setTimeout(() => { toastBusy = false; pump(); }, ms + 150); }

// ------------------------------------------------------------------ HUD
export function buildHud() {
  const hud = $('hud'); hud.innerHTML = '';
  const box = el('div', 'hudbox');
  box.innerHTML = `<div class="row"><canvas id="hudFace" width="16" height="16"></canvas>
    <div><div id="hudName"></div><div id="hudLvl"></div><div class="bar xp"><i id="hudXp"></i></div></div></div>
    <div class="row" style="margin-top:5px"><canvas id="hudCoin" width="16" height="16" class="ico"></canvas><span id="hudCoins"></span><span class="grow"></span><span style="color:#7be0ff" id="hudShards"></span></div>`;
  hud.appendChild(box);
  const q = el('div', 'hudbox'); q.id = 'hudQuest';
  hud.appendChild(q);
  const mb = el('button', 'mbtn', STR.menu); mb.onclick = () => { sfx('tap'); openMenu(); };
  hud.appendChild(mb);
  if (!$('timerBox')) { const tb = el('div', 'hidden'); tb.id = 'timerBox'; $('ui').appendChild(tb); }
  paintIcon($('hudCoin'), 'coin');
  refreshHud();
}
export function setAbilityHint(text) {
  const b = $('btnB'), h = $('abHint'); if (!b || !h) return;
  b.classList.toggle('pulse', !!text); if (text) { h.textContent = text; h.classList.remove('hidden'); } else h.classList.add('hidden');
}
export function setTimer(text) { const t = $('timerBox'); if (!t) return; if (text) { t.textContent = text; t.classList.remove('hidden'); } else t.classList.add('hidden'); }
export function refreshHud() {
  const st = S.state, ch = content.characters[st.activeChar]; if (!ch || !$('hudName')) return;
  paintPortrait($('hudFace'), equippedLook(st.activeChar));
  $('hudName').textContent = ch.name;
  $('hudLvl').textContent = `${STR.lvl} ${st.level}`;
  $('hudXp').style.width = Math.round((st.xp / xpForLevel(st.level)) * 100) + '%';
  $('hudCoins').textContent = st.coins;
  $('hudShards').textContent = `${st.shards.length}/${Q.totalShards()} ◆`;
  const tq = Q.trackedQuest();
  $('hudQuest').innerHTML = tq ? `<b>${T(tq.title)}</b><br>${T(Q.objective(tq.id))}` : `<span class="dim">${st.shards.length >= Q.totalShards() ? STR.goAttic : (Q.currentMission() ? STR.mission.hint : STR.explore)}</span>`;
  const b = $('btnB'); const ab = ch.ability; b.innerHTML = `B<small>${esc(ab?.name || '')}</small><span class="cd"></span>`;
}

// ------------------------------------------------------------------ dialogue
export const lookFor = (who) => {
  if (who === 'player') return equippedLook(S.state.activeChar);
  return content.npcs[who]?.look || content.characters[who]?.look || null;
};
export const nameFor = (who) => (who === 'player' ? content.characters[S.state.activeChar].name : who === 'narrator' ? '' : content.npcs[who]?.name || content.characters[who]?.name || who);

let dlgResolve = null, typing = null;
function showDialogueBox(who, rawText, choices) {
  const text = tpl(rawText);
  const d = $('dialogue'); d.classList.remove('hidden'); d.innerHTML = '';
  const name = nameFor(who), look = lookFor(who);
  if (name) {
    const w = el('div', 'who'); const c = el('canvas'); w.appendChild(c); w.appendChild(el('span', '', esc(name)));
    if (look) paintPortrait(c, look); else c.style.display = 'none';
    d.appendChild(w);
  }
  const t = el('div', 'txt'); t.dir = 'auto'; d.appendChild(t);
  let i = 0;
  clearInterval(typing);
  typing = setInterval(() => { i++; t.textContent = text.slice(0, i); if (i % 3 === 0) sfx('talk'); if (i >= text.length) finishTyping(choices, d); }, 24);
  d.onclick = (e) => {
    if (e.target.closest('.choice')) return;
    if (typing) { clearInterval(typing); typing = null; t.textContent = text; finishTyping(choices, d, true); return; }
    if (!choices?.length && dlgResolve) { const r = dlgResolve; dlgResolve = null; sfx('tap'); r(null); }
  };
}
function finishTyping(choices, d) {
  if (typing) { clearInterval(typing); typing = null; }
  if (d.querySelector('.choices') || d.querySelector('.more')) return;
  if (choices?.length) {
    const box = el('div', 'choices');
    choices.forEach((c, idx) => { const b = el('button', 'choice', T(c.text)); b.dir = 'auto'; b.onclick = () => { sfx('tap'); if (dlgResolve) { const r = dlgResolve; dlgResolve = null; r(idx); } }; box.appendChild(b); });
    d.appendChild(box);
  } else d.appendChild(el('div', 'more', '▼'));
}
function waitBox(who, text, choices) { return new Promise((res) => { dlgResolve = res; showDialogueBox(who, text, choices); }); }
/** Ask a multiple-choice question inside the dialogue box. Resolves to the picked index. */
export async function choose(who, text, texts) { const i = await waitBox(who, text, texts.map((t) => ({ text: t }))); hideDialogue(); return i; }
export function hideDialogue() { clearInterval(typing); typing = null; $('dialogue').classList.add('hidden'); }
export const dialogueOpen = () => !$('dialogue').classList.contains('hidden');

/** Show a sequence of {who,text}. */
export async function say(lines) {
  for (const ln of lines) await waitBox(ln.who || 'narrator', ln.text);
  hideDialogue();
}

export function applyEffects(effects) {
  for (const e of effects || []) {
    switch (e.type) {
      case 'coins': addCoins(e.n); queueToast(STR.coinsGot(e.n)); sfx('coin'); break;
      case 'xp': addXp(e.n); queueToast(STR.xpGot(e.n)); break;
      case 'item': addItem(e.id, e.n || 1); queueToast(STR.gotItem(content.items[e.id]?.name || e.id)); sfx('pickup'); break;
      case 'giveOnce': if (!getFlag(e.key)) { setFlag(e.key); addItem(e.item, 1); queueToast(e.toast || STR.gotItem(content.items[e.item]?.name)); sfx('pickup'); } break;
      case 'flag': setFlag(e.key, e.value === undefined ? true : e.value); break;
      case 'shop': openShop(e.id); break;
      case 'teleport': hooks.teleport?.(e.map, e.x, e.y); break;
      case 'ending': hooks.ending?.(); break;
      case 'toast': queueToast(e.text); break;
      default: break;
    }
  }
  Q.evaluate(); refreshHud();
}

/** Run a dialogue graph by id. Returns when finished. */
export async function runDialogue(id) {
  const dlg = content.dialogues[id]; if (!dlg) return;
  let nodeId = 'start';
  while (nodeId) {
    const node = dlg[nodeId]; if (!node) break;
    if (node.branch) { const b = node.branch.find((x) => check(x.cond)); nodeId = b ? b.next : null; continue; }
    applyEffects(node.effects?.filter((e) => e.type !== 'shop' && e.type !== 'ending' && e.type !== 'teleport'));
    const choices = (node.choices || []).filter((c) => check(c.cond));
    if (!node.text) { nodeId = node.next || null; continue; }
    const pick = await waitBox(node.who || 'narrator', node.text, choices);
    if (choices.length && pick != null) {
      const c = choices[pick]; applyEffects(c.effects); hideDialogue();
      if (c.effects?.some((e) => e.type === 'shop')) return;
      nodeId = c.next || null;
    } else nodeId = node.next || null;
    const special = node.effects?.filter((e) => e.type === 'shop' || e.type === 'ending' || e.type === 'teleport');
    if (special?.length) { hideDialogue(); applyEffects(special); return; }
  }
  hideDialogue();
}

// ------------------------------------------------------------------ panels
let panelOnClose = null;
export const panelOpen = () => !$('panel').classList.contains('hidden');
export function closePanel() { $('panel').classList.add('hidden'); $('panel').innerHTML = ''; const f = panelOnClose; panelOnClose = null; if (f) f(); }
function openShell(title, onClose) {
  const p = $('panel'); p.innerHTML = ''; p.classList.remove('hidden'); panelOnClose = onClose || null;
  const h = el('h2', '', `<span>${esc(title)}</span>`); const x = el('button', 'mbtn', '✕'); x.onclick = () => { sfx('tap'); closePanel(); }; h.appendChild(x); p.appendChild(h);
  return p;
}
export function openPanelRaw(title, onClose) { const p = openShell(title, onClose); const body = el('div', 'body'); p.appendChild(body); return body; }

function card(inner, cls = '') { return el('div', 'card ' + cls, inner); }
function iconCanvas(item) { const c = el('canvas'); paintIcon(c, item.icon || 'default', item.color); return c; }

let menuTab = 'quests';
export function openMenu(tab) {
  if (tab) menuTab = tab;
  const p = openShell(STR.menu, () => { hooks.charChanged?.(); refreshHud(); saveGame(); });
  const tabs = el('div', 'tabs');
  ['quests', 'bag', 'album', 'awards', 'settings'].forEach((k) => {
    const label = STR.tabs[k === 'settings' ? 'more' : k];
    const b = el('button', 'tab' + (menuTab === k ? ' on' : ''), label); b.onclick = () => { sfx('tap'); menuTab = k; openMenu(); }; tabs.appendChild(b);
  });
  p.appendChild(tabs);
  const body = el('div', 'body'); p.appendChild(body);
  ({ quests: tabQuests, bag: tabBag, album: tabAlbum, awards: tabAwards, settings: tabSettings })[menuTab](body);
}

function tabQuests(body) {
  const act = Q.activeQuests();
  if (!act.length) body.appendChild(card(`<b>${STR.quests.none}</b><br><span class="sub">${STR.quests.noneSub}</span>`));
  act.forEach((q) => {
    const step = Q.currentStep(q.id);
    body.appendChild(card(`<b>${T(q.title)}</b><br>${T(q.summary || '')}<br><span class="goal">▶ ${T(Q.objective(q.id))}</span>${step?.hint ? `<br><span class="sub">${STR.quests.tip}: ${T(step.hint)}</span>` : ''}`));
  });
  const todo = Q.missions().filter((q) => S.state.quests[q.id]?.state !== 'done'), cur = Q.currentMission();
  if (todo.length > 1) {
    body.appendChild(el('h3', '', STR.quests.pickTitle)); body.appendChild(card(`<span class="sub">${STR.quests.pickHelp}</span>`));
    todo.forEach((q) => {
      const c = card(''), row = el('div', 'row'), on = cur?.id === q.id, started = S.state.quests[q.id]?.state === 'active';
      row.append(el('div', 'grow', `${started ? '▶ ' : ''}<b>${T(q.title)}</b><br><span class="sub">${T(q.summary || '')}</span>`));
      const b = el('button', 'btn' + (on ? ' alt' : ''), on ? STR.quests.picked : STR.quests.pick); b.disabled = on;
      b.onclick = () => { S.state.nextMission = q.id; saveGame(); sfx('tap'); closePanel(); hooks.missionPicked?.(); toast(`השלב הבא: ${tpl(q.title)}`); };
      row.appendChild(b); c.appendChild(row); body.appendChild(c);
    });
  }
  const done = Q.allQuests().filter((q) => S.state.quests[q.id]?.state === 'done');
  if (done.length) { body.appendChild(el('h3', '', STR.quests.done)); done.forEach((q) => body.appendChild(card(`<span class="done">✔</span> ${T(q.title)}`))); }
}
function tabBag(body) {
  const ids = Object.keys(S.state.inv);
  body.appendChild(card(`<b>${STR.bag.coins}:</b> ${S.state.coins} &nbsp; <b>${STR.bag.level}:</b> ${S.state.level}`));
  if (!ids.length) body.appendChild(card(`<span class="sub">${STR.bag.empty}</span>`));
  ids.forEach((id) => {
    const it = content.items[id]; if (!it) return;
    const c = card(''); const row = el('div', 'row'); row.append(iconCanvas(it));
    const info = el('div', 'grow', `<b>${esc(it.name)}</b> x${S.state.inv[id]}<br><span class="sub">${esc(it.desc || '')}</span>`); row.appendChild(info);
    if (it.type === 'consumable') { const b = el('button', 'btn', STR.bag.use); b.onclick = () => { removeItem(id, 1); if (it.use?.xp) addXp(it.use.xp); if (it.use?.resetCooldown) hooks.resetCooldown?.(); sfx('pickup'); toast(STR.bag.used(it.name)); refreshHud(); openMenu(); }; row.appendChild(b); }
    c.appendChild(row); body.appendChild(c);
  });
  const owned = S.state.owned.outfits;
  if (owned.length) {
    body.appendChild(el('h3', '', STR.bag.outfits));
    const ch = S.state.activeChar;
    const none = card(`<div class="row"><span class="grow">${STR.bag.defaultLook}</span></div>`); const nb = el('button', 'btn alt', S.state.equipped[ch] ? STR.bag.wear : STR.bag.worn); nb.disabled = !S.state.equipped[ch];
    nb.onclick = () => { delete S.state.equipped[ch]; hooks.charChanged?.(); sfx('tap'); openMenu(); }; none.querySelector('.row').appendChild(nb); body.appendChild(none);
    owned.forEach((id) => {
      const it = content.items[id]; const c = card(''); const row = el('div', 'row'); row.append(iconCanvas(it));
      const info = el('div', 'grow', `<b>${esc(it.name)}</b><br><span class="sub">${esc(it.desc || '')}</span>`); row.appendChild(info);
      const worn = S.state.equipped[ch] === id; const b = el('button', 'btn alt', worn ? STR.bag.worn : STR.bag.wear); b.disabled = worn;
      b.onclick = () => { S.state.equipped[ch] = id; hooks.charChanged?.(); sfx('pickup'); openMenu(); }; row.appendChild(b); c.appendChild(row); body.appendChild(c);
    });
  }
  const ups = S.state.owned.upgrades;
  if (ups.length) { body.appendChild(el('h3', '', STR.bag.upgrades)); ups.forEach((id) => { const it = content.items[id]; const c = card(''); const row = el('div', 'row'); row.append(iconCanvas(it), el('div', 'grow', `<b>${esc(it.name)}</b><br><span class="sub">${esc(it.desc)}</span>`)); c.appendChild(row); body.appendChild(c); }); }
}
function tabAlbum(body) {
  const total = Q.totalShards();
  body.appendChild(card(`<b>${STR.album.title}</b><br><span class="sub">${STR.album.restored(S.state.shards.length, total)}</span>`));
  Q.allQuests().filter((q) => q.reward?.shard).forEach((q) => {
    const got = S.state.shards.includes(q.reward.shard.id);
    body.appendChild(card(got ? `<b style="color:#7be0ff">◆ ${T(q.reward.shard.title)}</b><br>${T(q.reward.shard.story)}` : `<b class="sub">◇ ???</b><br><span class="sub">${STR.album.hint(q.order)}</span>`, got ? '' : 'locked'));
  });
}
function tabAwards(body) {
  Object.values(content.achievements).forEach((a) => {
    const got = S.state.achievements.includes(a.id);
    body.appendChild(card(`${got ? '<span class="done">★</span>' : '☆'} <b>${esc(a.title)}</b><br><span class="sub">${esc(a.desc)}</span>${a.reward?.coins ? `<br><span class="sub">${STR.awards.reward(a.reward.coins)}</span>` : ''}`, got ? '' : 'locked'));
  });
}
function tabSettings(body) {
  const a = audioSettings();
  const row = (label, on, fn) => { const c = card(''); const r = el('div', 'row'); r.appendChild(el('span', 'grow', label)); const b = el('button', 'btn' + (on ? '' : ' red'), on ? STR.settings.on : STR.settings.off); b.onclick = () => { fn(!on); sfx('tap'); openMenu(); }; r.appendChild(b); c.appendChild(r); body.appendChild(c); };
  row(STR.settings.music, a.music, (v) => { setMusic(v); S.state.settings.music = v; });
  row(STR.settings.sfx, a.sfx, (v) => { setSfx(v); S.state.settings.sfx = v; });
  body.appendChild(card(`<b>${STR.settings.stats}</b><br><span class="sub">${STR.settings.statsLine(S.state.stats)}</span>`));
  if (cloudEnabled()) {
    const cc = card('<b>☁ שמירה בענן</b><br><span class="sub">ההתקדמות נשמרת אוטומטית בענן, בלי קוד. בפתיחת המשחק בטלפון אחר, בוחרים את אותה דמות וההתקדמות חוזרת.</span>');
    const b2 = el('button', 'btn alt', 'טעינה מהענן עכשיו'); b2.onclick = async () => { const ch = await syncSlotFromCloud(S.state.activeChar); toast(ch ? 'נטענה התקדמות מהענן' : 'אין בענן התקדמות חדשה יותר'); if (ch) { hooks.continueGame?.(); closePanel(); } };
    const rw = el('div', 'row'); rw.style.justifyContent = 'flex-start'; rw.append(b2); cc.append(rw); body.appendChild(cc);
  }
  const sv = card(`<b>${STR.settings.saveTitle}</b><br><span class="sub">${STR.settings.saveHelp}</span>`);
  const ta = el('textarea'); ta.placeholder = STR.settings.paste; ta.dir = 'ltr';
  const bx = el('button', 'btn alt', STR.settings.showCode); bx.onclick = () => { ta.value = exportCode(); ta.select(); };
  const bi = el('button', 'btn', STR.settings.import); bi.onclick = () => { if (importCode(ta.value, (id) => confirm(STR.settings.overwrite(content.characters[id]?.name || id)))) { toast(STR.settings.imported); hooks.continueGame?.(); closePanel(); } else toast(STR.settings.badCode); };
  const btns = el('div', 'row'); btns.style.justifyContent = 'flex-start'; btns.append(bx, bi);
  sv.append(ta, btns); body.appendChild(sv);
  const rs = el('button', 'btn red', STR.settings.restart(content.characters[S.state.activeChar].name)); rs.style.marginBottom = '8px';
  rs.onclick = () => { if (confirm(STR.settings.restartAsk)) { const id = S.state.activeChar; S.started = false; clearSave(id); closePanel(); startNewGame(id); S.started = true; hooks.newGame?.(); } };
  body.appendChild(rs);
  const nb = el('button', 'btn red', STR.settings.backTitle); nb.onclick = () => { closePanel(); saveGame(); hooks.toTitle?.(); }; body.appendChild(nb);
}

// ------------------------------------------------------------------ album: choose a memory (story) to play
export function openStories() {
  const body = openPanelRaw(STR.stories.title, () => refreshHud());
  body.appendChild(card(`<b>${STR.album.title}</b><br><span class="sub">${STR.stories.help}</span><br>${STR.album.restored(S.state.shards.length, Q.totalShards())}`));
  const order = { active: 0, new: 1, done: 2, locked: 3 };
  Q.allQuests().filter((q) => q.scene).sort((a, b) => order[Q.questStatus(a)] - order[Q.questStatus(b)]).forEach((q) => {
    const st = Q.questStatus(q);
    const c = card('', st === 'locked' ? 'locked' : '');
    const mark = { active: '▶', new: '◇', done: '<span class="done">✔</span>', locked: '🔒' }[st];
    const row = el('div', 'row'); const info = el('div', 'grow', `${mark} <b>${T(q.title)}</b><br><span class="sub">${T(q.summary || '')}</span>`);
    const b = el('button', 'btn' + (st === 'done' ? ' alt' : ''), st === 'active' ? STR.stories.resume : st === 'done' ? STR.stories.replay : STR.stories.enter); b.disabled = st === 'locked';
    b.onclick = () => { sfx('door'); closePanel(); hooks.enterStory?.(q.id); };
    row.append(info, b); c.appendChild(row); body.appendChild(c);
  });
}

// ------------------------------------------------------------------ shop
export function openShop(shopId) {
  const body = openPanelRaw(STR.shop.title, () => refreshHud());
  const render = () => {
    body.innerHTML = '';
    body.appendChild(card(`<b>${STR.shop.coins(S.state.coins)}</b>`));
    (content.shop[shopId] || []).forEach((id) => {
      const it = content.items[id]; if (!it) return;
      const owned = (it.type === 'outfit' && S.state.owned.outfits.includes(id)) || (it.type === 'upgrade' && S.state.owned.upgrades.includes(id));
      const c = card(''); const row = el('div', 'row'); row.append(iconCanvas(it));
      const info = el('div', 'grow', `<b>${esc(it.name)}</b><br><span class="sub">${esc(it.desc || '')}</span>`); row.appendChild(info);
      const b = el('button', 'btn' + (owned ? ' alt' : ''), owned ? STR.shop.owned : `${it.price} ◎`); b.disabled = owned || S.state.coins < it.price;
      b.onclick = () => { const r = buy(id); sfx(r.ok ? 'buy' : 'bad'); toast(r.ok ? STR.buy.bought(it.name) : STR.buy[r.code]); refreshHud(); render(); };
      row.appendChild(b); c.appendChild(row); body.appendChild(c);
    });
  };
  render();
}

// ------------------------------------------------------------------ reward cards
export function showReward(title, lines, onClose) {
  const body = openPanelRaw(title, onClose);
  body.appendChild(card(lines.map((l) => T(l)).join('<br>')));
  const b = el('button', 'btn', STR.common.cont); b.id = 'btnContinue'; b.style.marginTop = '10px'; b.onclick = () => { sfx('tap'); closePanel(); }; body.appendChild(b);
}

// ------------------------------------------------------------------ title
function titleHeader(t) {
  const cfg = content.config;
  const banner = el('canvas'); paintTitleBanner(banner, Object.values(content.characters).map((c) => c.look));
  t.append(banner, el('h1', '', esc(cfg.title)), el('p', '', esc(cfg.tagline)));
}
export function showTitle() {
  const t = $('title'); t.classList.remove('hidden'); t.innerHTML = '';
  titleHeader(t);
  t.appendChild(el('h3', '', STR.title.who));
  const last = lastChar();
  const grid = el('div', 'picker');
  for (const [id, c] of Object.entries(content.characters)) {
    const saved = peekSave(id);
    const b = el('button', 'pick' + (id === last ? ' last' : '')); const cv = el('canvas'); paintPortrait(cv, c.look);
    b.append(cv, el('span', '', esc(c.name)), el('small', saved ? 'has' : '', saved ? STR.title.progress(saved.shards?.length || 0, Q.totalShards()) : STR.title.newTag));
    b.dataset.id = id;
    b.onclick = async () => {
      try {
        sfx('tap');
        if (id !== 'visitor' && cloudAutoOn()) { showLoading('טוען שחקן...'); try { await syncSlotFromCloud(id); } catch (e) { /* offline: play from this phone's save */ } }
        if (peekSave(id)) { t.classList.add('hidden'); loadGame(id); hooks.continueGame?.(); hideLoading(); return; }
        hideLoading();
        if (id === 'visitor') {
          const guest = await askGuest(); if (!guest) return;
          if (cloudAutoOn()) { try { if (await syncSlotFromCloud(id, guest.name) && peekSave(id)) { t.classList.add('hidden'); loadGame(id); hooks.continueGame?.(); return; } } catch (e) { /* offline */ } }
          t.classList.add('hidden'); startNewGame(id, guest); hooks.newGame?.(); return;
        }
        if ((await modal(STR.title.confirmPick(c.name), ['כן, מתחילים', 'ביטול'])).i === 0) { t.classList.add('hidden'); startNewGame(id); hooks.newGame?.(); }
      } catch (e) { hideLoading(); toast('שגיאה: ' + (e.message || e), 4000); }
    };
    grid.appendChild(b);
  }
  t.append(grid, el('p', '', STR.title.pickHelp));
  if (cloudEnabled()) {
    t.appendChild(el('p', 'sub', '☁ ההתקדמות נשמרת גם בענן, כך שהיא חוזרת בכל טלפון (גם אחרי גלישה פרטית).'));
    syncAllFromCloud().then((n) => { if (n && !$('title').classList.contains('hidden')) showTitle(); });
  }
  t.appendChild(el('p', '', STR.title.tip));
}
/** A visible "loading" message over the title screen. */
function showLoading(text) {
  hideLoading(); const o = el('div', 'loadingMsg', esc(text));
  o.style.cssText = 'position:fixed;inset:0;background:rgba(10,6,24,.78);display:flex;align-items:center;justify-content:center;z-index:9998;color:#ffd23f;font:700 22px system-ui,sans-serif;pointer-events:all';
  document.body.appendChild(o);
}
function hideLoading() { document.querySelectorAll('.loadingMsg').forEach((x) => x.remove()); }
/** In-page dialog (native confirm/prompt can be blocked by the browser, which made taps do nothing). */
function modal(text, buttons, withInput) {
  return new Promise((res) => {
    const o = el('div', 'modal'); o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px';
    const box = el('div', 'card'); box.style.cssText = 'max-width:340px;width:100%;text-align:center'; box.appendChild(el('p', '', esc(text)));
    let inp = null; if (withInput) { inp = el('input'); inp.style.cssText = 'width:100%;padding:10px;margin:8px 0;font-size:16px'; box.appendChild(inp); }
    buttons.forEach((txt, i) => { const b = el('button', 'btn' + (i ? ' alt' : ''), esc(txt)); b.style.margin = '4px'; b.onclick = () => { o.remove(); res({ i, value: inp ? inp.value : '' }); }; box.appendChild(b); });
    o.appendChild(box); document.body.appendChild(o); if (inp) inp.focus();
  });
}
/** The guest character asks for a name and a form of address (Hebrew is gendered). */
async function askGuest() {
  const n = await modal('איך קוראים לך? (אפשר להשאיר ריק)', ['המשך', 'ביטול'], true); if (n.i === 1) return null;
  const g = await modal('לאיזו לשון לפנות אליך?', ['בת (לשון נקבה)', 'בן (לשון זכר)']);
  return { name: (n.value || '').trim().slice(0, 14) || 'אורח', gender: g.i === 0 ? 'f' : 'm' };
}
export function hideTitle() { $('title').classList.add('hidden'); }

export async function showIntro() {
  await say(content.config.intro.map((text) => ({ who: 'narrator', text })));
  const ab = content.characters[S.state.activeChar]?.ability;
  if (ab) await say([{ who: 'narrator', text: STR.ability.tutorial(ab.name, ab.desc) }]);
}
export async function showEnding() {
  await say(content.config.outro.map((text) => ({ who: 'narrator', text })));
  setFlag('game_complete'); saveGame();
  showReward(STR.ending.end, [STR.ending.l1, STR.ending.l2(S.state.level, S.state.coins), STR.ending.l3], () => {});
}

onChange((type, data) => {
  if (type === 'coins' || type === 'xp' || type === 'item' || type === 'flag' || type === 'itemLost') refreshHud();
  if (type === 'levelup') { sfx('levelup'); queueToast(STR.ev.levelUp(data), 2400); }
  if (type === 'achievement') { sfx('achieve'); queueToast(STR.ev.achievement(data.title), 2600); }
  if (type === 'questStarted') { queueToast(STR.ev.newQuest(tpl(data.title)), 2200); refreshHud(); }
  if (type === 'stepDone') { refreshHud(); }
  if (type === 'charUnlocked') queueToast(STR.ev.newHero(content.characters[data]?.name), 2600);
});
