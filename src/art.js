// Procedural pixel art: everything is drawn on canvases in code, no image assets needed.
export const TILE = 16;

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}
const px = (ctx, col, x, y, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}
export { shade };
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------------------------------------------------------------- tiles
export const TILE_NAMES = ['grass', 'grass2', 'flower', 'path', 'wood', 'tile', 'rug', 'wall', 'wallface', 'water', 'sand', 'fence', 'dark', 'carpet', 'roof', 'void'];
export const TILE_SOLID = new Set(['wall', 'wallface', 'water', 'fence', 'roof', 'void']);

function drawTile(ctx, name, ox, oy, seed) {
  const r = rng(seed);
  const fillNoise = (base, cols, n) => {
    px(ctx, base, ox, oy, 16, 16);
    for (let i = 0; i < n; i++) px(ctx, cols[(r() * cols.length) | 0], ox + ((r() * 16) | 0), oy + ((r() * 16) | 0), 1, 1);
  };
  switch (name) {
    case 'grass': fillNoise('#4fae4a', ['#5cc455', '#3e9a3f', '#6bd062'], 26); break;
    case 'grass2': fillNoise('#47a444', ['#56b950', '#389038'], 22);
      px(ctx, '#2f7d33', ox + 4, oy + 9, 1, 3); px(ctx, '#2f7d33', ox + 11, oy + 3, 1, 3); break;
    case 'flower': fillNoise('#4fae4a', ['#5cc455', '#3e9a3f'], 18);
      for (const [x, y, c] of [[3, 4, '#ff6b9d'], [11, 9, '#ffd23f'], [6, 12, '#ffffff']]) { px(ctx, c, ox + x, oy + y); px(ctx, c, ox + x + 1, oy + y); px(ctx, '#fff3a0', ox + x, oy + y + 1); } break;
    case 'path': fillNoise('#c9b48a', ['#b59f74', '#d9c79f', '#a89066'], 28);
      px(ctx, '#a89066', ox, oy + 7, 16, 1); px(ctx, '#a89066', ox + 7, oy, 1, 7); px(ctx, '#a89066', ox + 3, oy + 8, 1, 8); px(ctx, '#a89066', ox + 12, oy + 8, 1, 8); break;
    case 'wood': px(ctx, '#b27a46', ox, oy, 16, 16);
      for (let y = 0; y < 16; y += 4) px(ctx, '#8a5a30', ox, oy + y, 16, 1);
      for (let i = 0; i < 6; i++) px(ctx, '#c58d55', ox + ((r() * 16) | 0), oy + ((r() * 16) | 0), 2, 1);
      px(ctx, '#8a5a30', ox + 5, oy + 1, 1, 3); px(ctx, '#8a5a30', ox + 11, oy + 5, 1, 3); px(ctx, '#8a5a30', ox + 3, oy + 9, 1, 3); px(ctx, '#8a5a30', ox + 13, oy + 13, 1, 3); break;
    case 'tile': px(ctx, '#e8e2d2', ox, oy, 16, 16); px(ctx, '#c9c1ad', ox, oy, 16, 1); px(ctx, '#c9c1ad', ox, oy, 1, 16);
      px(ctx, '#c9c1ad', ox + 8, oy, 1, 16); px(ctx, '#c9c1ad', ox, oy + 8, 16, 1); px(ctx, '#f6f1e3', ox + 2, oy + 2, 2, 1); break;
    case 'rug': px(ctx, '#b3322e', ox, oy, 16, 16); px(ctx, '#e8b33a', ox + 1, oy + 1, 14, 1); px(ctx, '#e8b33a', ox + 1, oy + 14, 14, 1);
      px(ctx, '#e8b33a', ox + 1, oy + 1, 1, 14); px(ctx, '#e8b33a', ox + 14, oy + 1, 1, 14); px(ctx, '#7a1f1c', ox + 6, oy + 6, 4, 4); px(ctx, '#e8b33a', ox + 7, oy + 7, 2, 2); break;
    case 'wall': px(ctx, '#7a4b32', ox, oy, 16, 16);
      for (let y = 0; y < 16; y += 4) { px(ctx, '#5c3522', ox, oy + y, 16, 1); for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) px(ctx, '#5c3522', ox + x, oy + y, 1, 4); }
      px(ctx, '#8c5a3d', ox + 2, oy + 1, 3, 1); break;
    case 'wallface': px(ctx, '#e7c9a0', ox, oy, 16, 16); px(ctx, '#d4b185', ox, oy + 12, 16, 4); px(ctx, '#a5784a', ox, oy + 12, 16, 1);
      px(ctx, '#f0d9b5', ox + 3, oy + 3, 2, 1); px(ctx, '#d9b98d', ox + 9, oy + 6, 1, 3); break;
    case 'water': px(ctx, '#2f7fd6', ox, oy, 16, 16); for (let i = 0; i < 5; i++) px(ctx, '#6db3f2', ox + ((r() * 14) | 0), oy + ((r() * 16) | 0), 3, 1);
      px(ctx, '#215fa8', ox + 2, oy + 12, 4, 1); break;
    case 'sand': fillNoise('#ecd49a', ['#f6e2b0', '#d9bf84', '#cdb070'], 24); break;
    case 'fence': px(ctx, '#4fae4a', ox, oy, 16, 16); px(ctx, '#e6d3a8', ox, oy + 5, 16, 2); px(ctx, '#e6d3a8', ox, oy + 10, 16, 2);
      for (const x of [1, 8, 14]) { px(ctx, '#caa86d', ox + x, oy + 2, 2, 12); px(ctx, '#f3e6c2', ox + x, oy + 2, 2, 1); } break;
    case 'dark': fillNoise('#2c2542', ['#352d52', '#241e38'], 18); break;
    case 'carpet': px(ctx, '#5a8f6a', ox, oy, 16, 16); for (let y = 0; y < 16; y += 4) px(ctx, '#4a7a58', ox, oy + y, 16, 1); for (let i = 0; i < 12; i++) px(ctx, '#6fa57e', ox + ((r() * 16) | 0), oy + ((r() * 16) | 0), 1, 1); break;
    case 'roof': px(ctx, '#b84a2e', ox, oy, 16, 16); for (let y = 0; y < 16; y += 4) px(ctx, '#8f3a22', ox, oy + y + 3, 16, 1);
      for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) px(ctx, '#8f3a22', ox + x, oy + y, 1, 3); break;
    default: px(ctx, '#000', ox, oy, 16, 16);
  }
}

export function tileAtlasCanvas() {
  const [c, ctx] = makeCanvas(TILE * TILE_NAMES.length, TILE);
  TILE_NAMES.forEach((n, i) => drawTile(ctx, n, i * TILE, 0, 1000 + i * 7));
  return c;
}
export function buildTileAtlas(scene) {
  const c = tileAtlasCanvas();
  if (scene.textures.exists('tiles')) scene.textures.remove('tiles');
  scene.textures.addCanvas('tiles', c);
  return c;
}

// Renders a whole map (array of strings + legend) into one canvas.
export function renderMapCanvas(map, atlasCanvas) {
  const h = map.tiles.length, w = map.tiles[0].length;
  const [c, ctx] = makeCanvas(w * TILE, h * TILE);
  const rr = rng(77);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let name = map.legend[map.tiles[y][x]] || 'grass';
    if (name === 'grass' && rr() < 0.18) name = 'grass2';
    const i = TILE_NAMES.indexOf(name);
    ctx.drawImage(atlasCanvas, i * TILE, 0, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
  }
  return c;
}

// ---------------------------------------------------------------- props
const PROPS = {
  tree: [24, 32, (c) => { px(c, 'rgba(0,0,0,.25)', 5, 28, 14, 3); px(c, '#6b4423', 10, 18, 4, 11); px(c, '#4d2f15', 10, 18, 1, 11);
    for (const [x, y, w, h, col] of [[3, 6, 18, 14, '#2f8f3a'], [6, 2, 12, 8, '#3da64a'], [2, 10, 8, 8, '#2f8f3a'], [14, 10, 8, 8, '#2a8035']]) px(c, col, x, y, w, h);
    px(c, '#58c46a', 7, 4, 4, 2); px(c, '#58c46a', 5, 10, 3, 2); px(c, '#1f6a2b', 12, 16, 7, 2); }],
  bush: [16, 14, (c) => { px(c, 'rgba(0,0,0,.2)', 1, 11, 14, 3); px(c, '#2f8f3a', 1, 4, 14, 8); px(c, '#3da64a', 3, 2, 10, 5); px(c, '#58c46a', 4, 3, 3, 2); px(c, '#ff6b9d', 10, 6, 2, 2); }],
  rock: [14, 10, (c) => { px(c, '#8a8a99', 1, 3, 12, 6); px(c, '#a8a8b8', 3, 1, 8, 4); px(c, '#6c6c7a', 1, 8, 12, 1); px(c, '#c5c5d4', 4, 2, 2, 1); }],
  table: [32, 22, (c) => { px(c, 'rgba(0,0,0,.2)', 2, 18, 28, 4); px(c, '#8a5a30', 3, 14, 3, 6); px(c, '#8a5a30', 26, 14, 3, 6); px(c, '#c58d55', 1, 4, 30, 11); px(c, '#dda76e', 1, 4, 30, 2); px(c, '#9d6a3a', 1, 14, 30, 1);
    px(c, '#fff', 6, 6, 6, 5); px(c, '#e84b4b', 7, 7, 4, 3); px(c, '#ffd23f', 20, 6, 5, 5); px(c, '#b8860b', 21, 7, 3, 3); }],
  sofa: [32, 20, (c) => { px(c, 'rgba(0,0,0,.2)', 2, 17, 28, 3); px(c, '#6a3fa0', 1, 3, 30, 8); px(c, '#8556c4', 3, 1, 26, 5); px(c, '#6a3fa0', 1, 9, 30, 8); px(c, '#4f2b7d', 1, 15, 30, 2);
    px(c, '#8556c4', 4, 9, 11, 5); px(c, '#8556c4', 17, 9, 11, 5); px(c, '#4f2b7d', 1, 3, 3, 14); px(c, '#4f2b7d', 28, 3, 3, 14); }],
  bed: [22, 32, (c) => { px(c, 'rgba(0,0,0,.2)', 1, 29, 20, 3); px(c, '#6b4423', 1, 1, 20, 30); px(c, '#e8e2f5', 3, 3, 16, 8); px(c, '#fff', 4, 4, 14, 5); px(c, '#4a8fe0', 3, 12, 16, 17); px(c, '#6ba8f0', 3, 12, 16, 3); px(c, '#356fb5', 3, 26, 16, 3); }],
  fridge: [16, 30, (c) => { px(c, 'rgba(0,0,0,.2)', 1, 27, 14, 3); px(c, '#dfe6ee', 1, 1, 14, 27); px(c, '#b7c3d1', 1, 11, 14, 1); px(c, '#9aa8ba', 12, 4, 1, 5); px(c, '#9aa8ba', 12, 14, 1, 8); px(c, '#fff', 3, 3, 2, 6); px(c, '#ff6b9d', 5, 14, 4, 4); }],
  stove: [16, 22, (c) => { px(c, 'rgba(0,0,0,.2)', 1, 19, 14, 3); px(c, '#444a56', 1, 2, 14, 17); px(c, '#2a2e38', 3, 4, 10, 4); px(c, '#ff8a3d', 5, 5, 2, 2); px(c, '#ff8a3d', 9, 5, 2, 2); px(c, '#2a2e38', 3, 11, 10, 6); px(c, '#9aa8ba', 4, 12, 8, 1); }],
  tv: [24, 22, (c) => { px(c, 'rgba(0,0,0,.2)', 2, 19, 20, 3); px(c, '#222', 1, 2, 22, 15); px(c, '#4fd0ff', 3, 4, 18, 11); px(c, '#9be8ff', 4, 5, 6, 2); px(c, '#333', 9, 17, 6, 2); }],
  plant: [12, 20, (c) => { px(c, 'rgba(0,0,0,.2)', 1, 17, 10, 3); px(c, '#b3562f', 2, 11, 8, 7); px(c, '#8f3f20', 2, 11, 8, 1); px(c, '#2f8f3a', 1, 2, 4, 9); px(c, '#3da64a', 5, 0, 4, 11); px(c, '#2f8f3a', 8, 4, 3, 7); }],
  sign: [16, 22, (c) => { px(c, 'rgba(0,0,0,.2)', 2, 19, 12, 3); px(c, '#6b4423', 7, 8, 2, 12); px(c, '#c58d55', 1, 1, 14, 9); px(c, '#8a5a30', 1, 9, 14, 1); px(c, '#4d2f15', 3, 3, 10, 1); px(c, '#4d2f15', 3, 6, 7, 1); }],
  chest: [16, 14, (c) => { px(c, 'rgba(0,0,0,.2)', 1, 12, 14, 2); px(c, '#8a5a30', 1, 4, 14, 8); px(c, '#b27a46', 1, 2, 14, 4); px(c, '#ffd23f', 7, 5, 2, 4); px(c, '#4d2f15', 1, 6, 14, 1); }],
  shelf: [16, 30, (c) => { px(c, 'rgba(0,0,0,.2)', 1, 27, 14, 3); px(c, '#8a5a30', 1, 1, 14, 27); px(c, '#5c3a1c', 2, 9, 12, 1); px(c, '#5c3a1c', 2, 18, 12, 1);
    [['#e84b4b', 2], ['#4a8fe0', 5], ['#ffd23f', 8], ['#5be37d', 11]].forEach(([col, x]) => { px(c, col, x, 3, 3, 6); px(c, col, x, 12, 3, 6); px(c, col, x, 21, 3, 6); }); }],
  counter: [48, 24, (c) => { px(c, 'rgba(0,0,0,.2)', 2, 21, 44, 3); px(c, '#8a5a30', 1, 6, 46, 15); px(c, '#dda76e', 1, 3, 46, 5); px(c, '#6b4423', 1, 19, 46, 2);
    px(c, '#e84b4b', 6, 0, 8, 4); px(c, '#ffd23f', 18, 1, 6, 3); px(c, '#5be37d', 30, 0, 7, 4); px(c, '#4a8fe0', 40, 1, 5, 3); }],
  umbrella: [28, 30, (c) => { px(c, 'rgba(0,0,0,.2)', 6, 27, 16, 3); px(c, '#e8e2d2', 13, 8, 2, 20); px(c, '#e84b4b', 2, 3, 24, 6); px(c, '#fff', 8, 3, 6, 6); px(c, '#e84b4b', 14, 3, 6, 6); px(c, '#e84b4b', 5, 1, 18, 3); px(c, '#b3322e', 2, 8, 24, 1); }],
  lamp: [10, 26, (c) => { px(c, 'rgba(0,0,0,.2)', 1, 23, 8, 3); px(c, '#555', 4, 8, 2, 16); px(c, '#ffe27a', 1, 1, 8, 8); px(c, '#fff6c9', 2, 2, 3, 3); }],
  door: [16, 20, (c) => { px(c, '#4d2f15', 0, 0, 16, 20); px(c, '#8a5a30', 2, 2, 12, 18); px(c, '#6b4423', 4, 4, 8, 7); px(c, '#ffd23f', 11, 11, 2, 2); }],
  mat: [16, 8, (c) => { px(c, '#7a1f1c', 1, 1, 14, 6); px(c, '#e8b33a', 3, 3, 10, 2); }],
  boat: [40, 24, (c) => { px(c, '#6b4423', 2, 10, 36, 9); px(c, '#8a5a30', 4, 12, 32, 7); px(c, '#d8d0b8', 19, 0, 2, 12); px(c, '#fff', 21, 1, 12, 9); px(c, '#e84b4b', 21, 5, 12, 2); }],
  shard: [12, 12, (c) => { px(c, '#7be0ff', 5, 0, 2, 2); px(c, '#4fc3f7', 3, 2, 6, 3); px(c, '#4fc3f7', 1, 4, 10, 4); px(c, '#2b8fc9', 3, 8, 6, 2); px(c, '#2b8fc9', 5, 10, 2, 2); px(c, '#e6fbff', 4, 3, 2, 2); }],
  coin: [10, 10, (c) => { px(c, '#b8860b', 2, 0, 6, 10); px(c, '#b8860b', 0, 2, 10, 6); px(c, '#ffd23f', 2, 1, 6, 8); px(c, '#ffd23f', 1, 2, 8, 6); px(c, '#fff3a0', 3, 2, 2, 2); }],
  gem: [10, 10, (c) => { px(c, '#ff5d73', 2, 1, 6, 3); px(c, '#ff5d73', 1, 3, 8, 3); px(c, '#c93a50', 3, 6, 4, 2); px(c, '#ff9aa8', 3, 2, 2, 1); }],
  pickup: [10, 10, (c) => { px(c, '#fff', 1, 1, 8, 8); px(c, '#e84b4b', 2, 2, 6, 6); px(c, '#fff', 4, 3, 2, 4); px(c, '#fff', 3, 4, 4, 2); }],
};

export function buildProps(scene) {
  for (const [name, [w, h, fn]] of Object.entries(PROPS)) {
    const [c, ctx] = makeCanvas(w, h);
    fn(ctx);
    const key = 'prop_' + name;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, c);
  }
}
export function propCanvas(name) {
  const def = PROPS[name]; if (!def) return null;
  const [c, ctx] = makeCanvas(def[0], def[1]); def[2](ctx); return c;
}
export const PROP_SIZE = Object.fromEntries(Object.entries(PROPS).map(([k, v]) => [k, [v[0], v[1]]]));

// ---------------------------------------------------------------- characters
export const CHAR_W = 16, CHAR_H = 20;

export const DEFAULT_LOOK = { skin: '#f1c9a0', hair: '#4a2c17', hairStyle: 'short', shirt: '#3a7bd5', pants: '#2c3e72', accessory: 'none', hat: null };

/** Draw one frame. dir 0=down 1=up 2=left 3=right, f 0=idle 1/2=walk. */
export function drawCharFrame(ctx, ox, oy, dir, f, look) {
  const o = { ...DEFAULT_LOOK, ...look };
  const skinD = shade(o.skin, -28), hairD = shade(o.hair, -30), hairL = shade(o.hair, 28);
  const shirtD = shade(o.shirt, -35), pantsD = shade(o.pants, -30);
  const bob = f === 0 ? 0 : 1;
  const P = (col, x, y, w = 1, h = 1) => px(ctx, col, ox + x, oy + y, w, h);
  const side = dir >= 2;
  const mirror = dir === 3;
  const X = (x, w = 1) => (mirror ? 16 - x - w : x);
  const PX = (col, x, y, w = 1, h = 1) => P(col, X(x, w), y, w, h);

  P('rgba(0,0,0,.28)', 3, 17, 10, 2); P('rgba(0,0,0,.18)', 2, 18, 12, 1);
  // legs
  const legA = f === 1 ? -1 : 0, legB = f === 2 ? -1 : 0;
  if (!side) {
    PX(o.pants, 5, 13 + legA, 3, 3); PX(o.pants, 8, 13 + legB, 3, 3);
    PX(pantsD, 5, 15 + legA, 3, 1); PX(pantsD, 8, 15 + legB, 3, 1);
    PX('#241a33', 5, 16 + legA, 3, 1); PX('#241a33', 8, 16 + legB, 3, 1);
  } else {
    PX(o.pants, 6, 13 + legA, 3, 3); PX(o.pants, 8, 13 + legB, 3, 3);
    PX('#241a33', 6, 16 + legA, 3, 1); PX('#241a33', 8, 16 + legB, 3, 1);
  }
  // torso + arms
  const armSwing = f === 1 ? 1 : f === 2 ? -1 : 0;
  if (!side) {
    PX(o.shirt, 4, 8 + bob * 0, 8, 6); PX(shirtD, 4, 13, 8, 1); PX(shade(o.shirt, 20), 5, 9, 2, 1);
    PX(o.shirt, 3, 9 + armSwing, 1, 4); PX(o.shirt, 12, 9 - armSwing, 1, 4);
    PX(o.skin, 3, 13 + armSwing, 1, 1); PX(o.skin, 12, 13 - armSwing, 1, 1);
  } else {
    PX(o.shirt, 5, 8, 6, 6); PX(shirtD, 5, 13, 6, 1);
    PX(o.shirt, 7, 9 + armSwing, 2, 4); PX(o.skin, 7, 13 + armSwing, 2, 1);
  }
  // head
  const hy = bob ? 1 : 0;
  PX(o.skin, 4, 1 + hy, 8, 7); PX(o.skin, 5, 0 + hy, 6, 1); PX(skinD, 5, 8 + hy - 1, 6, 1);
  if (dir === 0) {            // facing front
    PX('#1a1020', 6, 5 + hy, 1, 2); PX('#1a1020', 9, 5 + hy, 1, 2); PX('#fff', 6, 5 + hy, 1, 1); PX('#fff', 9, 5 + hy, 1, 1);
    PX('#d9786a', 7, 7 + hy, 2, 1);
    if (o.accessory === 'glasses' || o.accessory === 'both') { PX('#222', 5, 4 + hy, 3, 1); PX('#222', 8, 4 + hy, 3, 1); PX('#222', 5, 7 + hy - 1, 3, 1); PX('#222', 8, 7 + hy - 1, 3, 1); PX('#222', 5, 4 + hy, 1, 3); PX('#222', 10, 4 + hy, 1, 3); PX('#222', 7, 4 + hy, 2, 1); }
    if (o.accessory === 'beard' || o.accessory === 'both') { PX('#3a2a20', 4, 6 + hy, 8, 3); PX('#d9786a', 7, 7 + hy, 2, 1); PX('#3a2a20', 5, 9 + hy - 1, 6, 1); }
  } else if (dir === 1) {     // back
    PX(o.hair, 4, 1 + hy, 8, 7); PX(o.hair, 5, 0 + hy, 6, 1); PX(hairD, 5, 7 + hy, 6, 1);
  } else {                    // side
    PX('#1a1020', 5, 5 + hy, 1, 2); PX('#fff', 5, 5 + hy, 1, 1); PX(skinD, 4, 7 + hy, 1, 1);
    if (o.accessory === 'glasses' || o.accessory === 'both') { PX('#222', 4, 4 + hy, 3, 1); PX('#222', 4, 4 + hy, 1, 3); }
    if (o.accessory === 'beard' || o.accessory === 'both') { PX('#3a2a20', 4, 6 + hy, 3, 3); }
  }
  // hair
  const hs = o.hairStyle;
  if (hs !== 'bald') {
    if (dir !== 1) {
      PX(o.hair, 4, 0 + hy, 8, 3); PX(o.hair, 5, -1 + hy < 0 ? 0 : -1 + hy, 6, 1); PX(hairL, 6, 0 + hy, 2, 1);
      if (!side) { PX(o.hair, 3, 2 + hy, 1, 3); PX(o.hair, 12, 2 + hy, 1, 3); PX(o.hair, 4, 3 + hy, 1, 1); PX(o.hair, 11, 3 + hy, 1, 1); }
      else { PX(o.hair, 8, 2 + hy, 4, 5); PX(o.hair, 4, 2 + hy, 1, 1); }
      if (hs === 'long') { if (!side) { PX(o.hair, 3, 4 + hy, 1, 8); PX(o.hair, 12, 4 + hy, 1, 8); PX(hairD, 3, 11 + hy, 1, 1); PX(hairD, 12, 11 + hy, 1, 1); } else { PX(o.hair, 8, 6 + hy, 4, 6); } }
      if (hs === 'curly') { PX(o.hair, 3, 0 + hy, 10, 2); PX(o.hair, 3, 3 + hy, 1, 3); PX(o.hair, 12, 3 + hy, 1, 3); PX(hairL, 5, 0 + hy, 1, 1); PX(hairL, 9, 1 + hy, 1, 1); }
      if (hs === 'bun') { PX(o.hair, 6, -1 + hy < 0 ? 0 : -1, 4, 1); }
    } else if (hs === 'long') { PX(o.hair, 3, 8 + hy, 10, 4); PX(hairD, 3, 11 + hy, 10, 1); }
  } else if (dir !== 1) PX('#fff', 6, 1 + hy, 2, 1);
  if (o.hat) {
    PX(o.hat, 3, -1 + hy < 0 ? 0 : -1 + hy, 10, 3); PX(shade(o.hat, -35), 3, 2 + hy, 10, 1);
    if (dir === 0) PX(shade(o.hat, -35), 4, 3 + hy, 8, 1); else if (side) PX(shade(o.hat, -35), 2, 2 + hy, 3, 1);
  }
}

export function characterTexture(scene, key, look) {
  if (scene.textures.exists(key)) return key;
  const [c, ctx] = makeCanvas(CHAR_W * 3, CHAR_H * 4);
  for (let dir = 0; dir < 4; dir++) for (let f = 0; f < 3; f++) drawCharFrame(ctx, f * CHAR_W, dir * CHAR_H + 1, dir, f, look);
  const tex = scene.textures.addCanvas(key, c);
  for (let i = 0; i < 12; i++) tex.add(i, 0, (i % 3) * CHAR_W, ((i / 3) | 0) * CHAR_H, CHAR_W, CHAR_H);
  for (let dir = 0; dir < 4; dir++) {
    const mk = (name, frames, rate) => scene.anims.create({ key: `${key}_${name}${dir}`, frames: frames.map((f) => ({ key, frame: dir * 3 + f })), frameRate: rate, repeat: -1 });
    mk('walk', [1, 0, 2, 0], 8);
    mk('idle', [0], 1);
  }
  return key;
}

/** Small portrait canvas (head + shoulders) for dialogue and cards. */
export function portraitCanvas(look) {
  const [c, ctx] = makeCanvas(16, 16);
  drawCharFrame(ctx, 0, 1, 0, 0, look);
  return c;
}
export function paintPortrait(target, look) {
  const src = portraitCanvas(look);
  target.width = 16; target.height = 16;
  const ctx = target.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0);
}

// ---------------------------------------------------------------- icons
export function iconCanvas(kind, color = '#ffd23f') {
  const [c, ctx] = makeCanvas(16, 16);
  const d = shade(color, -45), l = shade(color, 45);
  const P = (col, x, y, w = 1, h = 1) => px(ctx, col, x, y, w, h);
  switch (kind) {
    case 'food': P('#e8b86b', 2, 8, 12, 5); P('#c58d55', 2, 12, 12, 2); P(color, 3, 6, 10, 3); P(l, 5, 6, 2, 1); P('#5be37d', 4, 5, 8, 1); break;
    case 'key': P(color, 2, 3, 6, 6); P('#000', 4, 5, 2, 2); P(color, 7, 6, 7, 2); P(d, 11, 8, 2, 3); P(d, 13, 8, 1, 2); break;
    case 'gem': P(color, 4, 3, 8, 3); P(color, 2, 5, 12, 4); P(d, 4, 9, 8, 2); P(d, 6, 11, 4, 2); P(l, 5, 4, 2, 1); break;
    case 'book': P(color, 3, 2, 10, 12); P(d, 3, 2, 2, 12); P('#fff', 6, 4, 6, 1); P('#fff', 6, 7, 6, 1); P('#fff', 6, 10, 4, 1); break;
    case 'hat': P(color, 4, 4, 8, 6); P(d, 2, 10, 12, 2); P(l, 5, 5, 3, 1); break;
    case 'shoe': P(color, 2, 6, 5, 6); P(color, 2, 10, 12, 3); P(d, 2, 12, 12, 1); P(l, 3, 7, 2, 1); break;
    case 'potion': P('#cfe8ff', 6, 2, 4, 3); P(color, 4, 6, 8, 7); P(l, 5, 7, 2, 3); P(d, 4, 12, 8, 1); break;
    case 'toy': P(color, 3, 3, 10, 10); P(d, 3, 11, 10, 2); P('#fff', 5, 6, 2, 2); P('#fff', 9, 6, 2, 2); P('#000', 6, 7, 1, 1); P('#000', 10, 7, 1, 1); break;
    case 'star': P(color, 7, 1, 2, 4); P(color, 2, 5, 12, 3); P(color, 4, 8, 8, 4); P(color, 3, 12, 3, 2); P(color, 10, 12, 3, 2); P(l, 7, 3, 2, 2); break;
    case 'phone': P('#222', 4, 1, 8, 14); P('#6fd3ff', 5, 3, 6, 9); P(color, 7, 13, 2, 1); break;
    case 'remote': P('#333', 5, 1, 6, 14); P(color, 6, 3, 2, 2); P('#e84b4b', 9, 3, 1, 1); P('#5be37d', 6, 7, 4, 1); P('#fff', 6, 9, 4, 1); P('#fff', 6, 11, 4, 1); break;
    case 'ticket': P(color, 2, 4, 12, 8); P(d, 7, 4, 1, 8); P('#fff', 4, 6, 2, 1); P('#fff', 9, 6, 4, 1); P('#fff', 9, 8, 3, 1); break;
    case 'shirt': P(color, 4, 3, 8, 10); P(color, 1, 3, 4, 4); P(color, 11, 3, 4, 4); P(d, 6, 3, 4, 2); P(l, 5, 6, 2, 3); break;
    case 'coin': P('#b8860b', 4, 2, 8, 12); P('#b8860b', 2, 4, 12, 8); P('#ffd23f', 4, 3, 8, 10); P('#ffd23f', 3, 4, 10, 8); P('#fff3a0', 5, 4, 2, 3); break;
    default: P(color, 3, 3, 10, 10); P(d, 3, 11, 10, 2); P(l, 4, 4, 3, 2);
  }
  return c;
}
export function paintIcon(target, kind, color) {
  const src = iconCanvas(kind, color);
  target.width = 16; target.height = 16;
  const ctx = target.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0);
}

// ---------------------------------------------------------------- title banner
export function paintTitleBanner(target, looks) {
  target.width = 128; target.height = 48;
  const ctx = target.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const n = looks.length;
  const total = n * 20;
  let x = Math.max(0, (128 - total) / 2);
  looks.forEach((look, i) => { drawCharFrame(ctx, x + i * 20, 24 + (i % 2) * 2, 0, 0, look); drawCharFrame(ctx, x + i * 20, 4, 0, 0, { ...look, hat: null }); });
}
