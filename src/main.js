import Phaser from 'phaser';
import World from './scenes/World.js';
import { initControls, setControlsVisible, input } from './ui/controls.js';
import * as UI from './ui/ui.js';
import { S, saveGame } from './state.js';
import { initAudio, resumeAudio, setMusic, setSfx, stopMusic } from './audio.js';

let world = null;

function applySettings() { setMusic(S.state.settings.music); setSfx(S.state.settings.sfx); }
function showGameChrome(v) {
  document.getElementById('hud').style.display = v ? '' : 'none';
  setControlsVisible(v);
}

function boot() {
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
  window.__bz = { S, input, UI };

  game.events.once('ready', () => {
    world = game.scene.getScene('World');
    UI.showTitle();
  });

  UI.hooks.newGame = async () => {
    initAudio(); resumeAudio(); applySettings();
    showGameChrome(true); UI.buildHud();
    world.startWorld(); world.busy = true;
    await UI.showIntro();
    world.busy = false; saveGame();
  };
  UI.hooks.continueGame = () => {
    initAudio(); resumeAudio(); applySettings();
    showGameChrome(true); UI.buildHud();
    world.startWorld();
  };
  UI.hooks.toTitle = () => { stopMusic(); showGameChrome(false); if (world) world.busy = true; UI.showTitle(); };

  // register the service worker (offline play + installable PWA)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
  // first touch unlocks audio on iOS
  window.addEventListener('pointerdown', () => { initAudio(); resumeAudio(); }, { once: true });
}

boot();
