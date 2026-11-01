// Home screen (Duolingo style): daily circle path, game, leaderboard, store and more, with a bottom tab bar.
import { content } from '../content.js';
import { S, onChange, saveGame, buy, equippedLook } from '../state.js';
import { paintPortrait, paintIcon } from '../art.js';
import * as Q from '../systems/quests.js';
import * as Streak from '../systems/streak.js';
import * as UI from './ui.js';
import { sfx } from '../audio.js';
import { tpl } from '../i18n.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TABS = [['path', '🏠', 'מסלול'], ['game', '🎮', 'משחק'], ['board', '🏆', 'דירוג'], ['shop', '🛒', 'חנות'], ['more', '⚙️', 'עוד']];
let tab = 'path', boardSort = 'streak', boardCache = null;

export const isOpen = () => !!$('home') && !$('home').classList.contains('hidden');
export function hide() { const h = $('home'); if (h) h.classList.add('hidden'); }
export function show(t) {
  let h = $('home');
  if (!h) { h = el('div', 'hidden'); h.id = 'home'; $('ui').insertBefore(h, $('panel')); }
  if (t) tab = t;
  h.classList.remove('hidden'); UI.closePanel?.(); render();
}
export const refresh = () => { if (isOpen()) render(); };

function render() {
  if (tab === 'game') { hide(); return; }
  const h = $('home'); h.innerHTML = '';
  const st = S.state, s = Streak.info();
  const head = el('div', 'hHead');
  head.innerHTML = `<div class="hChip fire"><span>🔥</span><b>${s.count}</b></div><div class="hChip ice"><span>❄️</span><b>${s.freezes}</b></div><div class="hChip coin"><canvas id="hCoin" width="16" height="16"></canvas><b>${st.coins}</b></div><span class="grow"></span><canvas id="hFace" width="16" height="16"></canvas>`;
  h.appendChild(head);
  paintIcon(head.querySelector('#hCoin'), 'coin'); paintPortrait(head.querySelector('#hFace'), equippedLook(st.activeChar));
  const body = el('div', 'hBody'); h.appendChild(body);
  ({ path: tabPath, board: tabBoard, shop: tabShop, more: tabMore })[tab](body);
  const nav = el('div', 'hNav');
  TABS.forEach(([k, ico, label]) => {
    const b = el('button', 'hTab' + (tab === k ? ' on' : ''), `<span>${ico}</span><small>${label}</small>`);
    b.onclick = () => { sfx('tap'); tab = k; render(); };
    nav.appendChild(b);
  });
  h.appendChild(nav);
}

function modal(inner, buttons) {
  const o = el('div', 'hModal'), box = el('div', 'hSheet'); box.innerHTML = inner;
  const row = el('div', 'hBtns');
  buttons.forEach(([label, cls, fn]) => { const b = el('button', 'hBtn ' + cls, label); b.onclick = () => { o.remove(); fn?.(); }; row.appendChild(b); });
  box.appendChild(row); o.appendChild(box); o.onclick = (e) => { if (e.target === o) o.remove(); };
  $('home').appendChild(o);
}

// ------------------------------------------------------------------ path
function start(q) {
  hide(); sfx('door');
  setTimeout(() => UI.hooks.enterStory?.(q.id), 50);
}
function tabPath(body) {
  const s = Streak.info(), status = Streak.todayStatus(), cur = Q.currentMission();
  const hero = el('div', 'hHero');
  hero.innerHTML = `<div class="hFlame">🔥</div><div class="hBig">${s.count}</div><div class="hLbl">${s.count === 1 ? 'יום ברצף' : 'ימים ברצף'}</div>`
    + `<div class="hSub">${s.count ? `השיא שלך: ${Math.max(s.best, s.count)} · ❄️ קפיאות: ${s.freezes}/${Streak.FREEZE_MAX}` : 'מסיימים שלב אחד ביום ובונים רצף!'}</div>`;
  body.appendChild(hero);
  if (s.lost && !s.lost.restored && s.count === 0) body.appendChild(el('div', 'hNote bad', `הרצף של ${s.lost.count} ימים נקטע. מתחילים רצף חדש היום!`));
  const note = status === 'open' ? ['good', 'השלב של היום מוכן! 🎉']
    : status === 'wait' ? ['wait', (() => { const t = Streak.untilTomorrow(); return `כל הכבוד! השלב הבא ייפתח בעוד ${t.h} שעות ו-${t.m} דקות ⏳`; })()]
      : ['wait', 'אין כרגע שלב חדש. הרצף שלך בטוח, מחכים לשלב הבא! 🕒'];
  body.appendChild(el('div', 'hNote ' + note[0], note[1]));

  const path = el('div', 'hPath'), offs = [0, 56, 84, 56, 0, -56, -84, -56];
  Q.missions().forEach((q, i) => {
    const state = S.state.quests[q.id]?.state;
    const kind = state === 'done' ? 'done' : (cur && q.id === cur.id ? (status === 'open' ? 'today' : 'wait') : 'lock');
    const row = el('div', 'hRow'); row.style.transform = `translateX(${offs[i % offs.length]}px)`;
    const ico = { done: '✔', today: '★', wait: '⏳', lock: '🔒' }[kind];
    const b = el('button', 'hNode ' + kind, ico);
    b.onclick = () => {
      sfx('tap');
      if (kind === 'today') modal(`<h3>${esc(tpl(q.title))}</h3><p>${esc(tpl(q.summary || ''))}</p>`, [['התחל', 'go', () => start(q)], ['אחר כך', 'gray']]);
      else if (kind === 'done') modal(`<h3>${esc(tpl(q.title))}</h3><p>שלב שהושלם. אפשר לשחק שוב להנאה, בלי פרס ובלי להשפיע על הרצף.</p>`, [['שחק שוב', 'go', () => start(q)], ['סגור', 'gray']]);
      else if (kind === 'wait') modal(`<h3>${esc(tpl(q.title))}</h3><p>${status === 'wait' ? 'הסיפור הזה ייפתח מחר.' : 'הסיפור הזה מחכה לך.'}</p>`, [['סגור', 'gray']]);
      else modal(`<h3>${state === 'active' ? esc(tpl(q.title)) : '???'}</h3><p>רוצים שזה יהיה השלב הבא?</p>`, [['כן, להקדים', 'go', () => { S.state.nextMission = q.id; saveGame(); render(); }], ['לא', 'gray']]);
    };
    row.appendChild(b);
    const cap = el('div', 'hCap', kind === 'lock' && state !== 'active' ? '' : esc(tpl(q.title)));
    row.appendChild(cap); path.appendChild(row);
  });
  if (status === 'none') { const row = el('div', 'hRow'); row.append(el('button', 'hNode soon', '?'), el('div', 'hCap', 'בקרוב: סיפור חדש')); path.appendChild(row); }
  body.appendChild(path);
  if (status === 'open' && cur) { const go = el('button', 'hBtn go big', 'התחל את השלב של היום'); go.onclick = () => { sfx('tap'); start(cur); }; body.appendChild(go); }
}

// ------------------------------------------------------------------ leaderboard
function tabBoard(body) {
  const sorts = [['streak', '🔥 רצף'], ['coins', '◎ מטבעות']];
  const bar = el('div', 'hSeg');
  sorts.forEach(([k, l]) => { const b = el('button', 'hSegBtn' + (boardSort === k ? ' on' : ''), l); b.onclick = () => { boardSort = k; render(); }; bar.appendChild(b); });
  body.appendChild(bar);
  const list = el('div', 'hList'); body.appendChild(list);
  const me = Streak.info();
  const draw = (rows) => {
    list.innerHTML = '';
    const mine = { char: S.state.activeChar, name: content.characters[S.state.activeChar]?.name, coins: S.state.coins, count: me.count };
    const by = new Map((rows || []).map((r) => [r.char, r])); if (S.state.activeChar !== 'visitor') by.set(mine.char, { ...by.get(mine.char), ...mine });
    const all = [...by.values()].filter((r) => content.characters[r.char]).sort((a, b) => boardSort === 'streak' ? (b.count || 0) - (a.count || 0) || (b.coins || 0) - (a.coins || 0) : (b.coins || 0) - (a.coins || 0) || (b.count || 0) - (a.count || 0));
    if (!all.length) list.appendChild(el('div', 'hNote wait', 'אין עדיין נתונים. משחקים והדירוג יתמלא!'));
    all.forEach((r, i) => {
      const row = el('div', 'hLine' + (r.char === S.state.activeChar ? ' me' : ''));
      const cv = el('canvas'); cv.width = 16; cv.height = 16; paintPortrait(cv, content.characters[r.char].look);
      row.append(el('span', 'hRank', ['🥇', '🥈', '🥉'][i] || String(i + 1)), cv, el('span', 'grow hName', esc(content.characters[r.char].name)),
        el('b', 'hVal', boardSort === 'streak' ? `🔥 ${r.count || 0}` : `◎ ${r.coins || 0}`));
      list.appendChild(row);
    });
  };
  draw(boardCache);
  Streak.leaderboard().then((rows) => { boardCache = rows; if (isOpen() && tab === 'board' && list.isConnected) draw(rows); });
}

// ------------------------------------------------------------------ store
function tabShop(body) {
  const s = Streak.info(), coins = S.state.coins;
  const f = el('div', 'hCard');
  f.innerHTML = `<div class="hCardRow"><span class="hEmoji">❄️</span><div class="grow"><b>קפיאת רצף</b><br><span class="hSub">מגנה על הרצף ביום שמפספסים. מחזיקים עד ${Streak.FREEZE_MAX}. מקבלים אחת במתנה כל ${Streak.FREEZE_EVERY} ימים ברצף.</span></div></div>`;
  const b = el('button', 'hBtn go', s.freezes >= Streak.FREEZE_MAX ? 'מלא' : `${Streak.FREEZE_PRICE} ◎`); b.disabled = s.freezes >= Streak.FREEZE_MAX || coins < Streak.FREEZE_PRICE;
  b.onclick = () => { const r = Streak.buyFreeze(); sfx(r.ok ? 'buy' : 'bad'); UI.toast(r.ok ? 'נקנתה קפיאה ❄️' : r.code === 'full' ? 'כבר יש לך מקסימום קפיאות' : 'אין מספיק מטבעות'); UI.refreshHud(); render(); };
  f.appendChild(b); body.appendChild(f);
  const ids = [...new Set(Object.values(content.shop).flat())];
  body.appendChild(el('h3', 'hH3', 'פריטים'));
  ids.forEach((id) => {
    const it = content.items[id]; if (!it) return;
    const owned = (it.type === 'outfit' && S.state.owned.outfits.includes(id)) || (it.type === 'upgrade' && S.state.owned.upgrades.includes(id));
    const c = el('div', 'hCard'), row = el('div', 'hCardRow'), cv = el('canvas'); cv.width = 16; cv.height = 16; paintIcon(cv, it.icon || 'default', it.color);
    row.append(cv, el('div', 'grow', `<b>${esc(it.name)}</b><br><span class="hSub">${esc(it.desc || '')}</span>`)); c.appendChild(row);
    const bb = el('button', 'hBtn ' + (owned ? 'gray' : 'go'), owned ? 'שלך' : `${it.price} ◎`); bb.disabled = owned || coins < it.price;
    bb.onclick = () => { const r = buy(id); sfx(r.ok ? 'buy' : 'bad'); UI.toast(r.ok ? `נקנה: ${it.name}` : 'אין מספיק מטבעות'); UI.refreshHud(); render(); };
    c.appendChild(bb); body.appendChild(c);
  });
}

// ------------------------------------------------------------------ more
function tabMore(body) {
  const items = [['settings', '⚙️', 'הגדרות ושמירה'], ['awards', '🏅', 'הישגים'], ['album', '📖', 'אלבום זיכרונות'], ['bag', '🎒', 'תיק ולבוש']];
  items.forEach(([k, ico, label]) => { const b = el('button', 'hMenu', `<span>${ico}</span><b>${label}</b>`); b.onclick = () => { sfx('tap'); UI.openMenu(k); }; body.appendChild(b); });
  const out = el('button', 'hMenu', '<span>🚪</span><b>החלפת שחקן / מסך פתיחה</b>'); out.onclick = () => { hide(); saveGame(); UI.hooks.toTitle?.(); }; body.appendChild(out);
}

// ------------------------------------------------------------------ streak events
onChange((type, data) => {
  if (type === 'coins') refresh();
  if (type !== 'streak') return;
  for (const e of data || []) {
    if (e.type === 'up') UI.queueToast(`🔥 הרצף שלך: ${e.count} ${e.count === 1 ? 'יום' : 'ימים'}!`, 2800);
    if (e.type === 'gift') UI.queueToast('קיבלת קפיאה במתנה ❄️', 2800);
    if (e.type === 'froze') UI.queueToast(`❄️ הקפיאה הצילה את הרצף שלך (${e.n} ${e.n === 1 ? 'יום' : 'ימים'})`, 3600);
    if (e.type === 'lost') UI.queueToast(`הרצף של ${e.count} ימים נקטע. מתחילים מחדש!`, 3600);
  }
  UI.refreshHud(); refresh();
});
