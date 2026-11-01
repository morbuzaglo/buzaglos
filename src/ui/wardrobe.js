// Character room: change your own appearance (free) and buy / wear clothes (coins). Opened from the face at the top of the home screen.
import { content } from '../content.js';
import { S, saveGame, equippedLook, buy } from '../state.js';
import { drawCharFrame } from '../charart.js';
import { paintIcon } from '../art.js';
import * as UI from './ui.js';
import { sfx } from '../audio.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SKIN = ['#fbe3cc', '#f4dcc2', '#f1c9a0', '#e8b88c', '#d9a679', '#b9825a', '#8a5a3c', '#5e3b26'];
const HAIR = ['#14110f', '#2b1a0e', '#4a2c17', '#7a4a24', '#b88a4a', '#e0c070', '#c9482b', '#9aa0a8', '#e8e8ea', '#c44aa8', '#3a7bd5', '#3fae6b'];
const EYES = ['#2a1a14', '#5a3a1a', '#2f6fb0', '#3a8a5a', '#6a6a72', '#8a5cc8'];
const STYLES = [['short', 'קצר'], ['long', 'ארוך'], ['curly', 'מתולתל'], ['bun', 'פקעת'], ['ponytail', 'קוקו'], ['bald', 'קירח']];
const CATS = [['shirt', '👕', 'חולצות', ['shirt']], ['pants', '👖', 'מכנסיים', ['pants']], ['shoes', '👟', 'נעליים', ['shoes']], ['hat', '🧢', 'כובעים', ['hat']],
  ['face', '🕶️', 'משקפיים', ['face']], ['jewel', '💍', 'תכשיטים', ['ear', 'neck']], ['hold', '🎒', 'אביזרים', ['hold']]];

let tab = 'look', cat = 'shirt', tryOn = null;
const ch = () => S.state.activeChar;
const mine = () => ((S.state.custom ||= {})[ch()] ||= {});
const wornMap = () => ((S.state.wear ||= {})[ch()] ||= {});

/** The look with a not-yet-bought item tried on (preview only; nothing is saved). */
function lookNow() {
  if (!tryOn) return equippedLook(ch());
  const w = wornMap(), prev = { ...w }; w[content.items[tryOn].slot] = tryOn;
  try { return equippedLook(ch()); } finally { for (const k of Object.keys(w)) delete w[k]; Object.assign(w, prev); }
}

export function open(startTab) {
  if (startTab) tab = startTab;
  tryOn = null;
  const body = UI.openPanelRaw('החדר שלי', () => { UI.hooks.charChanged?.(); UI.refreshHud(); saveGame(); UI.hooks.homeRefresh?.(); });
  const render = () => {
    body.innerHTML = '';
    const stage = el('div', 'wStage'); const cv = el('canvas'); cv.width = 24; cv.height = 34; drawCharFrame(cv.getContext('2d'), 0, 0, 0, 0, lookNow());
    stage.append(cv, el('div', 'wName', esc(content.characters[ch()].name)), el('div', 'wCoins', `${S.state.coins} ◎`));
    body.appendChild(stage);
    const seg = el('div', 'hSeg');
    [['look', 'מראה'], ['clothes', 'בגדים']].forEach(([k, l]) => { const b = el('button', 'hSegBtn' + (tab === k ? ' on' : ''), l); b.onclick = () => { sfx('tap'); tab = k; tryOn = null; render(); }; seg.appendChild(b); });
    body.appendChild(seg);
    (tab === 'look' ? lookTab : clothesTab)(body, render);
  };
  render();
}

function swatches(title, colors, current, onPick, render) {
  const box = el('div', 'wBox'); box.appendChild(el('h4', '', title));
  const row = el('div', 'wSw');
  colors.forEach((c) => { const b = el('button', 'wSwatch' + (current?.toLowerCase() === c ? ' on' : '')); b.style.background = c; b.onclick = () => { sfx('tap'); onPick(c); saveGame(); render(); }; row.appendChild(b); });
  box.appendChild(row); return box;
}

function lookTab(body, render) {
  const c = mine(), look = equippedLook(ch()), base = content.characters[ch()].look || {};
  body.appendChild(swatches('צבע עור', SKIN, c.skin || base.skin, (v) => { c.skin = v; }, render));
  body.appendChild(swatches('צבע שיער', HAIR, c.hair || base.hair, (v) => { c.hair = v; }, render));
  const st = el('div', 'wBox'); st.appendChild(el('h4', '', 'תסרוקת'));
  const chips = el('div', 'wChips');
  STYLES.forEach(([k, l]) => { const on = (c.hairStyle || base.hairStyle || 'short') === k; const b = el('button', 'wChip' + (on ? ' on' : ''), l); b.onclick = () => { sfx('tap'); c.hairStyle = k; saveGame(); render(); }; chips.appendChild(b); });
  st.appendChild(chips); body.appendChild(st);
  body.appendChild(swatches('צבע עיניים', EYES, c.eyes || base.eyes || EYES[0], (v) => { c.eyes = v; }, render));
  const bd = el('div', 'wBox'); bd.appendChild(el('h4', '', 'זקן'));
  const bc = el('div', 'wChips'), hasBeard = look.accessory === 'beard' || look.accessory === 'both';
  [[false, 'בלי'], [true, 'עם זקן']].forEach(([v, l]) => { const b = el('button', 'wChip' + (hasBeard === v ? ' on' : ''), l); b.onclick = () => { sfx('tap'); c.beard = v; saveGame(); render(); }; bc.appendChild(b); });
  bd.appendChild(bc); body.appendChild(bd);
  const rs = el('button', 'hBtn gray', 'חזרה למראה המקורי'); rs.style.marginTop = '6px';
  rs.onclick = () => { S.state.custom[ch()] = {}; sfx('tap'); saveGame(); render(); }; body.appendChild(rs);
}

function clothesTab(body, render) {
  const chips = el('div', 'wCats');
  CATS.forEach(([k, ico, l]) => { const b = el('button', 'wCat' + (cat === k ? ' on' : ''), `<span>${ico}</span><small>${l}</small>`); b.onclick = () => { sfx('tap'); cat = k; tryOn = null; render(); }; chips.appendChild(b); });
  body.appendChild(chips);
  const slots = CATS.find((c) => c[0] === cat)[3], worn = wornMap(), owned = S.state.owned.outfits;
  const list = Object.values(content.items).filter((it) => it.type === 'outfit' && slots.includes(it.slot)).sort((a, b) => (owned.includes(b.id) - owned.includes(a.id)) || (a.price - b.price));
  const wearing = slots.some((s) => worn[s]);
  const none = el('div', 'hCard'); const nrow = el('div', 'hCardRow');
  nrow.appendChild(el('div', 'grow', '<b>המקורי של הדמות</b><br><span class="hSub">בלי הפריט הזה</span>'));
  const nb = el('button', 'hBtn ' + (wearing ? 'gray' : 'go'), wearing ? 'להוריד' : 'לבוש'); nb.disabled = !wearing;
  nb.onclick = () => { slots.forEach((s) => delete worn[s]); sfx('tap'); UI.hooks.charChanged?.(); saveGame(); render(); };
  nrow.appendChild(nb); none.appendChild(nrow); body.appendChild(none);
  list.forEach((it) => {
    const has = owned.includes(it.id), on = worn[it.slot] === it.id;
    const c = el('div', 'hCard'), row = el('div', 'hCardRow'), icon = el('canvas'); icon.width = 16; icon.height = 16; paintIcon(icon, it.icon || 'shirt', it.color);
    row.append(icon, el('div', 'grow', `<b>${esc(it.name)}</b><br><span class="hSub">${esc(it.desc || '')}</span>`));
    c.appendChild(row);
    const acts = el('div', 'hBtns row2');
    if (!has) {
      const t = el('button', 'hBtn gray', tryOn === it.id ? 'להוריד' : 'מדידה'); t.onclick = () => { sfx('tap'); tryOn = tryOn === it.id ? null : it.id; render(); }; acts.appendChild(t);
      const b = el('button', 'hBtn go', `${it.price} ◎`); b.disabled = S.state.coins < it.price;
      b.onclick = () => { const r = buy(it.id); sfx(r.ok ? 'buy' : 'bad'); if (r.ok) { worn[it.slot] = it.id; tryOn = null; UI.hooks.charChanged?.(); saveGame(); UI.toast(`נקנה: ${it.name}`); } else UI.toast('אין מספיק מטבעות'); UI.refreshHud(); render(); };
      acts.appendChild(b);
    } else {
      const b = el('button', 'hBtn ' + (on ? 'gray' : 'go'), on ? 'להוריד' : 'ללבוש');
      b.onclick = () => { if (on) delete worn[it.slot]; else worn[it.slot] = it.id; sfx('pickup'); UI.hooks.charChanged?.(); saveGame(); render(); };
      acts.appendChild(b);
    }
    c.appendChild(acts); body.appendChild(c);
  });
}
