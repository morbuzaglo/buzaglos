import Phaser from 'phaser';
import World from './scenes/World.js';
import { initControls, setControlsVisible, input } from './ui/controls.js';
import * as UI from './ui/ui.js';
import * as Home from './ui/home.js';
import * as Streak from './systems/streak.js';
import { S, saveGame, startNewGame, PREVIEW } from './state.js';
import * as St from './state.js';
import * as Q from './systems/quests.js';
import { content } from './content.js';
import { initAudio, resumeAudio, pauseAudio, setMusic, setSfx, stopMusic } from './audio.js';
import * as Shabbat from './systems/shabbat.js';

let world = null;

function applySettings() { setMusic(S.state.settings.music); setSfx(S.state.settings.sfx); }
function showGameChrome(v) {
  document.getElementById('hud').style.display = v ? '' : 'none';
  setControlsVisible(v);
}

/** Admin Studio preview: the draft content (written by the admin page) replaces the live content; nothing is saved. */
function loadPreview() {
  if (!PREVIEW) return null;
  try { const pv = JSON.parse(localStorage.getItem('bz-preview')); if (pv?.content) { Object.assign(content, pv.content); return pv; } } catch (e) { /* ignore */ }
  return null;
}

function boot() {
  const pv = loadPreview();
  initControls();
  UI.buildHud();
  showGameChrome(false);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1b1033',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: [World],
    input: { activePointers: 3 },
    fps: { target: 60 },
  });
  window.__game = game;
  window.__bz = { S, input, UI, Q, content, St, Shabbat };

  game.events.once('ready', () => {
    world = game.scene.getScene('World');
    if (pv) {
      const hub = content.config.hub || { map: 'house', x: 9, y: 12 };
      startNewGame(pv.who || content.config.startChar);
      Object.assign(S.state, { map: hub.map, x: hub.x, y: hub.y, dir: 0, flags: { ...(content.config.startFlags || {}) } });
      if (pv.ids) for (const q of Object.values(content.quests)) if (q.scene && !pv.ids.includes(q.id)) S.state.quests[q.id] = { state: 'done' };
      S.started = true; showGameChrome(true); UI.buildHud(); world.startWorld();
      if (pv.ids && pv.direct) setTimeout(() => world.enterStory(pv.ids[0]), 600);
      const bar = document.createElement('div'); bar.id = 'pvbar'; bar.textContent = 'תצוגה מקדימה של הטיוטה · לא נשמר'; document.body.appendChild(bar);
      return;
    }
    UI.showTitle();
  });

  UI.hooks.newGame = async () => {
    initAudio(); resumeAudio(); applySettings();
    showGameChrome(true); UI.buildHud();
    S.started = true; saveGame();
    world.startWorld(); world.busy = true; saveGame();
    await UI.showIntro();
    world.busy = false; saveGame();
    Streak.start().then(() => { UI.refreshHud(); Home.refresh(); }); Home.show('path');
  };
  UI.hooks.continueGame = () => {
    S.started = true;
    initAudio(); resumeAudio(); applySettings();
    showGameChrome(true); UI.buildHud();
    world.startWorld();
    Streak.start().then(() => { UI.refreshHud(); Home.refresh(); }); Home.show('path');
  };
  UI.hooks.showHome = (t) => Home.show(t);
  UI.hooks.toTitle = () => { Home.off(); S.started = false; stopMusic(); showGameChrome(false); if (world) world.busy = true; UI.showTitle(); };

  // Shabbat: the game is closed from candle lighting to Havdalah
  let closed = false;
  const watchShabbat = () => {
    const w = Shabbat.current(), box = document.getElementById('shabbat');
    if (w && !closed) {
      closed = true; if (S.started) saveGame(); pauseAudio(); game.pause();
      const o = document.createElement('div'); o.id = 'shabbat';
      o.innerHTML = `<div class="shCandles">🕯️ 🕯️</div><h1>${w.holiday ? 'חג שמח' : 'שבת שלום'}</h1><p>המשחק סגור בשבתות ובחגים, מכניסת ${w.holiday ? 'החג' : 'השבת'} ועד צאתו${w.holiday ? '' : 'ה'}.</p><p class="shTime">ייפתח שוב ${w.holiday ? 'במוצאי החג' : 'במוצאי שבת'}<br><b>${Shabbat.clock(w.to)}</b></p><p class="shSmall">זמנים לפי ${Shabbat.place().startsWith('Ramat Gan') ? 'רמת גן' : Shabbat.place().startsWith('Jerusalem') ? 'ירושלים' : Shabbat.place().replace(', Israel', '')}. ${w.holiday ? 'חג שמח ומבורך!' : 'שבת שלום ומבורך!'}</p>`;
      document.body.appendChild(o);
    } else if (!w && closed) { closed = false; box?.remove(); game.resume(); resumeAudio(); }
  };
  watchShabbat(); setInterval(watchShabbat, 15000); document.addEventListener('visibilitychange', watchShabbat);

  // register the service worker (offline play + installable PWA)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
  try { navigator.storage?.persist?.(); } catch (e) { /* ignore */ }
  setInterval(() => { if (S.started) saveGame(); }, 5000);
  window.addEventListener('beforeunload', () => { if (S.started) saveGame(); });
  // first touch unlocks audio on iOS
  window.addEventListener('pointerdown', () => { initAudio(); resumeAudio(); }, { once: true });
}

boot();
