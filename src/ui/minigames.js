// Touch mini-games. Each returns a Promise<boolean> (true = won). Data-driven via quest step config.
import { S, checkAchievements } from '../state.js';
import { sfx } from '../audio.js';
import { openPanelRaw, closePanel } from './ui.js';
import { STR, tpl } from '../i18n.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function playMinigame(game, config = {}, title = 'משחקון') {
  return new Promise((resolve) => {
    let finished = false, cleanup = () => {};
    const finish = (won) => {
      if (finished) return; finished = true; cleanup();
      if (won) { S.state.stats.minigames++; checkAchievements(); sfx('win'); } else sfx('bad');
      setTimeout(() => { closePanelSilently(); resolve(won); }, 700);
    };
    const body = openPanelRaw(title, () => { if (!finished) { finished = true; cleanup(); resolve(false); } });
    const box = el('div', 'mg'); body.appendChild(box);
    const quit = el('button', 'btn red', STR.mg.giveUp); quit.style.marginTop = '10px'; quit.onclick = () => finish(false);
    const games = { timing, memory, reaction, quiz };
    cleanup = (games[game] || timing)(box, config, finish) || (() => {});
    body.appendChild(quit);
  });
}
function closePanelSilently() { closePanel(); }

function timing(box, cfg, finish) {
  const rounds = cfg.rounds || 3, speed = cfg.speed || 1, zoneW = cfg.zone || 0.25;
  let round = 0, lives = 2, pos = 0, dir = 1, zoneX = 0.4, raf, last = performance.now(), locked = false;
  box.innerHTML = `<div id="mgInfo"></div><div class="track"><div class="zone"></div><div class="cursor"></div></div>`;
  const info = box.querySelector('#mgInfo'), zone = box.querySelector('.zone'), cur = box.querySelector('.cursor'), track = box.querySelector('.track');
  const btn = el('button', 'btn', STR.mg.stop); btn.id = 'mgStop'; btn.style.cssText = 'font-size:16px;padding:18px 40px;margin-top:10px'; box.appendChild(btn);
  const setup = () => { zoneX = 0.1 + Math.random() * (0.8 - zoneW); zone.style.left = zoneX * 100 + '%'; zone.style.width = zoneW * 100 + '%'; info.textContent = `${STR.mg.round(round + 1, rounds)}   ${STR.mg.lives} ${'♥'.repeat(lives)}`; };
  const tick = (t) => { const dt = (t - last) / 1000; last = t; pos += dir * dt * speed * (0.8 + round * 0.25); if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } cur.style.left = `calc(${pos * 100}% - 4px)`; raf = requestAnimationFrame(tick); };
  const press = () => {
    if (locked) return; locked = true;
    const hit = pos >= zoneX && pos <= zoneX + zoneW;
    if (hit) { sfx('coin'); round++; if (round >= rounds) { info.textContent = STR.mg.perfect; finish(true); return; } }
    else { sfx('bad'); lives--; if (lives <= 0) { info.textContent = STR.mg.burnt; finish(false); return; } }
    setTimeout(() => { locked = false; setup(); }, 350);
  };
  btn.onpointerdown = (e) => { e.preventDefault(); press(); };
  setup(); raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

function memory(box, cfg, finish) {
  const faces = ['🍎', '🥖', '🧀', '🥛', '🍌', '🥕', '🍇', '🍫', '🍋', '🥚'];
  const pairs = Math.min(cfg.pairs || 6, faces.length);
  const deck = shuffle([...faces.slice(0, pairs), ...faces.slice(0, pairs)]);
  let open = [], matched = 0, busy = false, moves = 0;
  box.innerHTML = `<div id="mgInfo">${STR.mg.match}</div>`;
  const grid = el('div', 'cards'); box.appendChild(grid);
  deck.forEach((f) => {
    const c = el('button', 'mcard', '?'); c.dataset.f = f;
    c.onclick = () => {
      if (busy || c.classList.contains('up') || c.classList.contains('ok')) return;
      c.classList.add('up'); c.textContent = f; sfx('tap'); open.push(c);
      if (open.length === 2) {
        moves++; busy = true;
        if (open[0].dataset.f === open[1].dataset.f) { open.forEach((x) => { x.classList.remove('up'); x.classList.add('ok'); }); sfx('coin'); matched++; open = []; busy = false; if (matched === pairs) { box.querySelector('#mgInfo').textContent = STR.mg.moves(moves); finish(true); } }
        else setTimeout(() => { open.forEach((x) => { x.classList.remove('up'); x.textContent = '?'; }); open = []; busy = false; }, 650);
      }
    };
    grid.appendChild(c);
  });
}

function reaction(box, cfg, finish) {
  const need = cfg.targets || 10, time = cfg.time || 20;
  let hits = 0, left = time, spawnT, tickT;
  box.innerHTML = `<div id="mgInfo"></div>`;
  const info = box.querySelector('#mgInfo'), arena = el('div', 'arena'); box.appendChild(arena);
  const upd = () => { info.textContent = `${STR.mg.hits} ${hits}/${need}   ${STR.mg.time} ${left}`; };
  const spawn = () => {
    const t = el('div', 'target', '🎉'); t.style.cssText += `display:flex;align-items:center;justify-content:center;font-size:22px;left:${Math.random() * 80 + 2}%;top:${Math.random() * 80 + 2}%`;
    t.onpointerdown = (e) => { e.preventDefault(); if (!t.isConnected) return; t.remove(); hits++; sfx('coin'); upd(); if (hits >= need) { cleanup(); info.textContent = STR.mg.awesome; finish(true); } };
    arena.appendChild(t); setTimeout(() => t.remove(), 1100);
  };
  const cleanup = () => { clearInterval(spawnT); clearInterval(tickT); };
  spawnT = setInterval(spawn, 620);
  tickT = setInterval(() => { left--; upd(); if (left <= 0) { cleanup(); info.textContent = STR.mg.timeUp; finish(false); } }, 1000);
  upd(); spawn();
  return cleanup;
}

function quiz(box, cfg, finish) {
  const qs = cfg.questions || []; let i = 0, ok = 0;
  const show = () => {
    const q = qs[i]; box.innerHTML = '';
    box.appendChild(el('div', 'card', `<b>${STR.mg.question(i + 1, qs.length)}</b><br>${tpl(q.q).replace(/</g, '&lt;')}`));
    q.a.forEach((a, idx) => {
      const b = el('button', 'choice', tpl(a).replace(/</g, '&lt;')); b.style.cssText = 'display:block;width:100%;margin-bottom:6px';
      b.onclick = () => {
        const right = idx === q.c; if (right) ok++; sfx(right ? 'coin' : 'bad'); b.style.background = right ? '#2e8b4a' : '#a83240';
        qs.length; setTimeout(() => { i++; if (i >= qs.length) { const win = ok >= Math.ceil(qs.length * 0.66); box.innerHTML = `<div class="card"><b>${STR.mg.correct(ok, qs.length)}</b></div>`; finish(win); } else show(); }, 650);
      };
      box.appendChild(b);
    });
  };
  if (!qs.length) { finish(true); return; }
  show();
}
