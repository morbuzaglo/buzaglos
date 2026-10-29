// Touch mini-games. Each returns a Promise<boolean> (true = won). Data-driven via quest step config.
import { S, checkAchievements } from '../state.js';
import { sfx } from '../audio.js';
import { openPanelRaw, closePanel } from './ui.js';
import { STR, tpl } from '../i18n.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function playMinigame(game, config = {}, title = 'משחקון') {
  if (typeof window !== 'undefined' && window.__bzTest?.autowin?.[game]) { S.state.stats.minigames++; return Promise.resolve(true); }   // test hook
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
    const games = { timing, memory, reaction, quiz, drive, sequence };
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
    else { sfx('bad'); lives--; if (lives <= 0) { info.textContent = cfg.failText || STR.mg.burnt; finish(false); return; } }
    setTimeout(() => { locked = false; setup(); }, 350);
  };
  btn.onpointerdown = (e) => { e.preventDefault(); press(); };
  setup(); raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

function memory(box, cfg, finish) {
  const faces = cfg.faces || ['🍎', '🥖', '🧀', '🥛', '🍌', '🥕', '🍇', '🍫', '🍋', '🥚'];
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
  box.innerHTML = `<div class="mgHelp" style="margin:0 0 6px;font-weight:700">${(cfg.instruction || 'לוחצים על כל סמל שקופץ על המסך לפני שהוא נעלם!').replace(/</g, '&lt;')}</div><div id="mgInfo"></div>`;
  const info = box.querySelector('#mgInfo'), arena = el('div', 'arena'); box.appendChild(arena);
  const upd = () => { info.textContent = `${STR.mg.hits} ${hits}/${need}   ${STR.mg.time} ${left}`; };
  const spawn = () => {
    const t = el('div', 'target', cfg.emoji || '🎉'); t.style.cssText += `display:flex;align-items:center;justify-content:center;font-size:22px;left:${Math.random() * 80 + 2}%;top:${Math.random() * 80 + 2}%`;
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
  const qs = (cfg.questions || []).map((q) => { const idx = shuffle(q.a.map((_, i) => i)); return { q: q.q, a: idx.map((i) => q.a[i]), c: idx.indexOf(q.c) }; });
  let i = 0, ok = 0, locked = false;
  const show = () => {
    const q = qs[i]; box.innerHTML = ''; locked = false;
    box.appendChild(el('div', 'card', `<b>${STR.mg.question(i + 1, qs.length)}</b><br>${tpl(q.q).replace(/</g, '&lt;')}`));
    q.a.forEach((a, idx) => {
      const b = el('button', 'choice', tpl(a).replace(/</g, '&lt;')); b.dir = 'auto'; b.style.cssText = 'display:block;width:100%;margin-bottom:6px';
      b.onclick = () => {
        if (locked) return; locked = true;
        const right = idx === q.c; if (right) ok++; sfx(right ? 'coin' : 'bad'); b.style.background = right ? '#2e8b4a' : '#a83240';
        setTimeout(() => { i++; if (i >= qs.length) { const win = ok >= Math.ceil(qs.length * 0.66); box.innerHTML = `<div class="card"><b>${STR.mg.correct(ok, qs.length)}</b></div>`; finish(win); } else show(); }, 650);
      };
      box.appendChild(b);
    });
  };
  if (!qs.length) { finish(true); return; }
  show();
}

// Lane runner: tap the left/right half of the road to change lane and dodge obstacles until time runs out.
function drive(box, cfg, finish) {
  const time = cfg.time || 15, lanes = 3, icons = cfg.obstacles || ['🚧', '🐌', '🛢️', '🚗'];
  let lane = 1, lives = 3, left = time, over = false, raf, last = performance.now(), spawnAcc = 0;
  box.innerHTML = '<div id="mgInfo"></div>';
  const info = box.querySelector('#mgInfo');
  const road = el('div', 'arena road'); road.style.height = '340px'; box.appendChild(road);
  const car = el('div', 'mover', cfg.car || '🚙'); road.appendChild(car);
  const obs = [];
  const place = (e, l, y) => { e.style.left = `calc(${(l + 0.5) * (100 / lanes)}% - 18px)`; e.style.top = y + 'px'; };
  const upd = () => { info.textContent = `${STR.mg.lives} ${'♥'.repeat(lives)}   ${STR.mg.time} ${Math.ceil(left)}`; place(car, lane, 280); };
  road.addEventListener('pointerdown', (e) => { const r = road.getBoundingClientRect(); lane = Math.max(0, Math.min(lanes - 1, lane + (e.clientX < r.left + r.width / 2 ? -1 : 1))); sfx('tap'); upd(); });
  const tick = (t) => {
    if (over) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; left -= dt; spawnAcc += dt;
    if (spawnAcc > 0.7) { spawnAcc = 0; const o = el('div', 'mover', icons[(Math.random() * icons.length) | 0]); const l = (Math.random() * lanes) | 0; o.dataset.lane = l; o.dataset.y = '-40'; road.appendChild(o); obs.push(o); }
    for (const o of [...obs]) {
      const y = parseFloat(o.dataset.y) + dt * 190; o.dataset.y = y; place(o, +o.dataset.lane, y);
      if (y > 255 && y < 305 && +o.dataset.lane === lane && !o.dataset.hit) { o.dataset.hit = '1'; lives--; sfx('bad'); car.style.filter = 'brightness(2)'; setTimeout(() => (car.style.filter = ''), 200); if (lives <= 0) { over = true; info.textContent = STR.mg.crashed; finish(false); return; } }
      if (y > 340) { o.remove(); obs.splice(obs.indexOf(o), 1); }
    }
    upd();
    if (left <= 0) { over = true; info.textContent = STR.mg.perfect; finish(true); return; }
    raf = requestAnimationFrame(tick);
  };
  upd(); raf = requestAnimationFrame(tick);
  return () => { over = true; cancelAnimationFrame(raf); };
}

// Simon-style memory: watch the flashing sequence, then repeat it.
function sequence(box, cfg, finish) {
  const icons = cfg.icons || ['🛒', '🏪', '👗', '☕'], len = cfg.length || 4;
  const seq = Array.from({ length: len }, () => (Math.random() * icons.length) | 0);
  let pos = 0, showing = true, alive = true;
  box.innerHTML = '<div id="mgInfo"></div>';
  const info = box.querySelector('#mgInfo'); info.textContent = cfg.watch || STR.mg.watch;
  const grid = el('div', 'cards'); box.appendChild(grid);
  const cells = icons.map((ic, i) => { const c = el('button', 'mcard', ic); c.onclick = () => press(i); grid.appendChild(c); return c; });
  const flash = (i) => new Promise((res) => { cells[i].classList.add('up'); sfx('tap'); setTimeout(() => { cells[i].classList.remove('up'); setTimeout(res, 200); }, 420); });
  const press = async (i) => {
    if (showing || !alive) return; await flash(i);
    if (i !== seq[pos]) { info.textContent = STR.mg.wrong; sfx('bad'); pos = 0; showing = true; await new Promise((r) => setTimeout(r, 700)); return play(); }
    pos++; if (pos >= seq.length) { info.textContent = STR.mg.perfect; finish(true); }
  };
  const play = async () => { showing = true; info.textContent = cfg.watch || STR.mg.watch; await new Promise((r) => setTimeout(r, 600)); for (const i of seq) { if (!alive) return; await flash(i); } showing = false; info.textContent = cfg.repeat || STR.mg.repeat; };
  play();
  return () => { alive = false; };
}
