// High-resolution (24x34) pixel characters with an automatic outline, shading and per-person details.
// look: { skin, hair, hairStyle: short|long|curly|bun|ponytail|bald, shirt, pants, shoes?, accessory: none|glasses|catglasses|beard|both,
//         beardColor?, hat?, hatStyle?: cap|kippah|scarf, bottom?: pants|skirt|longskirt, sleeves?: long|short|none,
//         eyes? (iris colour), extras?: [freckles, earrings, necklace, bowtie, headphones, mustache],
//         bag?, book?, stripes?, print?, collar?, wide? }
export const CHAR_W = 24, CHAR_H = 34;
export const DEFAULT_LOOK = { skin: '#f1c9a0', hair: '#4a2c17', hairStyle: 'short', shirt: '#3a7bd5', pants: '#2c3e72', accessory: 'none', hat: null };
const OUT = '#170d24', DY = 2;

function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function shade(c, amt) { return '#' + hex(c).map((v) => Math.max(0, Math.min(255, v + amt)).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }

export function drawCharFrame(ctx, ox, oy, dir, f, look) {
  const o = { ...DEFAULT_LOOK, ...look };
  const side = dir >= 2, mirror = dir === 3, back = dir === 1;
  const g = Array.from({ length: CHAR_H }, () => new Array(CHAR_W).fill(null));
  const set = (x, y, c) => { if (c == null) return; y += DY; if (mirror) x = CHAR_W - 1 - x; if (x >= 0 && x < CHAR_W && y >= 0 && y < CHAR_H) g[y][x] = c; };
  const R = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  const sk = o.skin, skD = shade(sk, -30), skL = shade(sk, 16), blush = mix(sk, '#ff7a7a', 0.38);
  const H = o.hair, HD = shade(H, -34), HL = shade(H, 30);
  const T = o.shirt, TD = shade(T, -38), TL = shade(T, 26);
  const P = o.pants, PD = shade(P, -34), PL = shade(P, 14);
  const SH = o.shoes || '#2b2433', SHD = shade(SH, -60), SHL = shade(SH, 30);
  const bottom = o.bottom || 'pants', sleeves = o.sleeves || 'long';
  const EYE = o.eyes || '#2a1a14';
  const ex = new Set(o.extras || []);
  const bob = f === 0 ? 0 : -1;                    // body bounces while walking
  const liftL = f === 1, liftR = f === 2;          // which leg is raised
  const armL = f === 1 ? 1 : f === 2 ? -1 : 0;

  // ---------------------------------------------------------------- legs / skirt / shoes
  const leg = (x0, w, lift, inner) => {
    const top = 24, bot = lift ? 27 : 28;
    if (bottom === 'pants') { R(x0, top, w, bot - top + 1, P); R(inner ? x0 + w - 1 : x0, top, 1, bot - top + 1, PD); if (o.stripes) R(inner ? x0 : x0 + w - 1, top + 1, 1, bot - top, '#f2f2f2'); }
    else R(x0 + 1, top + 3, w - 2, bot - top - 2, sk);           // bare legs under a skirt
    const sy = lift ? 28 : 29;
    R(x0 - (inner ? 0 : 1), sy, w + 1, 2, SH); R(x0 - (inner ? 0 : 1), sy + 1, w + 1, 1, SHD); set(x0 + 1, sy, SHL);
  };
  const legW = o.wide ? 5 : 4;
  if (!side) {
    leg(12 - legW, legW, liftL, false); leg(12, legW, liftR, true);
  } else {
    const a = liftL ? 1 : 0, b = liftR ? 1 : 0;
    if (bottom === 'pants') { R(11, 24, 4, 5 - b, PD); R(10, 24, 4, 5 - a, P); } else { R(11, 27, 3, 2 - b, skD); R(10, 27, 3, 2 - a, sk); }
    R(8, 29 - a, 6, 2, SH); R(8, 30 - a, 6, 1, SHD); R(11, 29 - b, 5, 2, shade(SH, -20)); set(9, 29 - a, SHL);
  }
  if (bottom !== 'pants') {                         // skirt over the legs
    const len = bottom === 'longskirt' ? 28 : 26;
    for (let y = 23; y <= len; y++) { const spread = Math.floor((y - 23) / 2); if (!side) { R(7 - spread, y, 10 + spread * 2, 1, P); set(7 - spread, y, PD); set(16 + spread, y, PD); } else R(9 - Math.floor(spread / 2), y, 7 + spread, 1, P); }
    if (!side) { for (let y = 24; y <= len; y += 1) { set(10, y, PD); set(14, y, PD); } R(7, 23, 10, 1, PD); }
  }

  // ---------------------------------------------------------------- torso + arms
  const ty = 15 + bob;
  if (!side) {
    R(7, ty, 10, 9, T); R(7, ty + 8, 10, 1, TD); R(16, ty + 1, 1, 8, TD); R(8, ty + 1, 1, 3, TL);
    if (o.collar) { R(9, ty, 6, 1, TL); set(10, ty + 1, TL); set(13, ty + 1, TL); R(11, ty, 2, 2, skD); }
    else if (!back) R(10, ty, 4, 1, skD);
    if (o.print && !back) { R(10, ty + 3, 4, 3, '#ff5d73'); R(11, ty + 4, 2, 1, '#ffd23f'); set(10, ty + 5, '#5bc0ff'); set(13, ty + 3, '#5be37d'); }
    const arm = (x, swing) => {
      const ay = ty + 1 + swing;
      if (sleeves === 'long') { R(x, ay, 2, 7, T); R(x + (x < 10 ? 0 : 1), ay, 1, 7, TD); R(x, ay + 7, 2, 2, sk); if (o.stripes) R(x + (x < 10 ? 0 : 1), ay + 1, 1, 6, '#f2f2f2'); }
      else if (sleeves === 'short') { R(x, ay, 2, 3, T); R(x, ay + 3, 2, 4, sk); R(x, ay + 7, 2, 2, sk); set(x + (x < 10 ? 0 : 1), ay + 5, skD); }
      else { R(x, ay, 2, 3, T); R(x, ay + 3, 2, 6, sk); R(x + (x < 10 ? 0 : 1), ay + 3, 1, 6, skD); }
    };
    arm(5, armL); arm(17, -armL);
  } else {
    R(9, ty, 7, 9, T); R(15, ty + 1, 1, 8, TD); R(9, ty + 8, 7, 1, TD);
    if (o.collar && !back) { R(9, ty, 3, 1, TL); }
    const ay = ty + 1 + armL;
    if (sleeves === 'long') { R(11, ay, 3, 7, T); R(13, ay, 1, 7, TD); R(11, ay + 7, 3, 2, sk); if (o.stripes) R(12, ay + 1, 1, 6, '#f2f2f2'); }
    else if (sleeves === 'short') { R(11, ay, 3, 3, T); R(11, ay + 3, 3, 6, sk); R(13, ay + 3, 1, 6, skD); }
    else { R(11, ay, 3, 3, T); R(11, ay + 3, 3, 6, sk); R(13, ay + 3, 1, 6, skD); }
  }
  // extras on the body
  if (o.bag) {
    if (!side) { for (let i = 0; i < 8; i++) set(back ? 15 - i : 8 + i, ty + 1 + i, '#2a2a31'); R(back ? 3 : 16, ty + 7, 4, 7, '#2a2a31'); R(back ? 3 : 16, ty + 7, 4, 1, '#44444f'); set(back ? 4 : 17, ty + 10, '#ffd23f'); }
    else R(11, ty + 7, 4, 7, '#2a2a31');
  }
  if (o.book && !side) { R(back ? 3 : 17, ty + 8, 3, 5, '#f4f4f8'); R(back ? 3 : 17, ty + 8, 3, 1, '#d8b64a'); set(back ? 4 : 18, ty + 10, '#8a8a99'); }
  // neck
  if (!side) R(10, 14 + bob, 4, 2, skD); else R(10, 14 + bob, 4, 2, skD);

  // ---------------------------------------------------------------- head
  const hy = bob;
  const headRows = [[8, 15], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17], [8, 15]];   // y 2..13
  const head = (xs) => headRows.forEach(([a, b], i) => R(a + xs, 2 + i + hy, b - a + 1, 1, sk));
  if (!side) {
    head(0); R(7, 13 + hy, 10, 1, skD);
    if (!o.hat || o.hatStyle !== 'scarf') { R(5, 8 + hy, 1, 3, sk); R(18, 8 + hy, 1, 3, sk); set(5, 9 + hy, skD); set(18, 9 + hy, skD); }
    if (!back) {
      const eye = (x) => { R(x, 8 + hy, 2, 1, '#1a1020'); R(x, 9 + hy, 2, 1, EYE); set(x, 9 + hy, '#ffffff'); set(x + 1, 9 + hy, EYE); };
      eye(9); eye(14);
      R(9, 7 + hy, 2, 1, HD); R(14, 7 + hy, 2, 1, HD);
      set(12, 10 + hy, skD); set(12, 11 + hy, skD);
      R(10, 12 + hy, 4, 1, '#b5524c'); set(9, 11 + hy, '#b5524c'); set(14, 11 + hy, '#b5524c');
      set(7, 11 + hy, blush); set(16, 11 + hy, blush); set(8, 11 + hy, blush); set(15, 11 + hy, blush);
    }
  } else {
    const rows = [[9, 16], [7, 17], [7, 17], [7, 17], [7, 17], [7, 17], [7, 17], [7, 17], [7, 17], [7, 17], [7, 17], [9, 15]];
    rows.forEach(([a, b], i) => R(a, 2 + i + hy, b - a + 1, 1, sk));
    set(6, 9 + hy, sk); set(6, 10 + hy, skD);                              // nose
    R(9, 8 + hy, 2, 1, '#1a1020'); R(9, 9 + hy, 2, 1, EYE); set(9, 9 + hy, '#ffffff'); R(9, 7 + hy, 2, 1, HD);
    R(8, 12 + hy, 3, 1, '#b5524c'); set(9, 11 + hy, blush); set(10, 11 + hy, blush);
    R(13, 8 + hy, 2, 3, sk); set(14, 9 + hy, skD);                          // ear
  }

  // ---------------------------------------------------------------- hair / head covering
  const hs = o.hairStyle, covered = o.hat && o.hatStyle === 'scarf';
  if (!covered) {
    if (hs !== 'bald') {
      if (!side) {
        const top = back ? 11 : 0;                                        // back view: hair covers the whole head
        R(8, 1 + hy, 8, 1, H); R(6, 2 + hy, 12, 3, H); R(6, 5 + hy, 12, back ? 8 : 0, H);
        if (!back) { R(6, 5 + hy, 2, 4, H); R(16, 5 + hy, 2, 4, H); R(9, 5 + hy, 6, 1, H); R(8, 5 + hy, 1, 1, HD); R(15, 5 + hy, 1, 1, HD); set(11, 5 + hy, sk); set(12, 5 + hy, sk); }
        R(8, 2 + hy, 3, 1, HL); set(14, 3 + hy, HL);
        if (back) { R(7, 12 + hy, 10, 1, HD); R(10, 8 + hy, 4, 1, HD); }
        if (hs === 'long') { const ex = back ? 0 : 1; R(5, 5 + hy, 2, 17 + ex * 0, H); R(17, 5 + hy, 2, 17, H); R(5, 21 + hy, 2, 1, HD); R(17, 21 + hy, 2, 1, HD); if (back) { R(7, 12 + hy, 10, 10, H); R(7, 21 + hy, 10, 1, HD); R(11, 14 + hy, 1, 7, HD); } }
        if (hs === 'curly') { R(5, 1 + hy, 14, 4, H); R(4, 3 + hy, 2, 6, H); R(18, 3 + hy, 2, 6, H); for (const x of [6, 9, 12, 15]) set(x, 0 + hy, H); set(7, 2 + hy, HL); set(13, 1 + hy, HL); if (back) R(5, 5 + hy, 14, 8, H); }
        if (hs === 'bun') { R(10, -1 + hy, 4, 2, H); R(9, 0 + hy, 6, 1, H); set(11, -1 + hy, HL); }
        if (hs === 'ponytail') { if (back) { R(10, 12 + hy, 4, 8, H); R(10, 19 + hy, 4, 1, HD); } else R(17, 4 + hy, 2, 5, H); }
      } else {
        R(9, 1 + hy, 8, 1, H); R(8, 2 + hy, 10, 4, H); R(12, 6 + hy, 6, 7, H); R(8, 5 + hy, 2, 2, H); R(10, 3 + hy, 3, 1, HL);
        set(8, 6 + hy, HD); R(13, 12 + hy, 4, 1, HD);
        if (hs === 'long') { R(12, 12 + hy, 6, 10, H); R(12, 21 + hy, 6, 1, HD); R(15, 14 + hy, 1, 6, HD); }
        if (hs === 'curly') { R(7, 1 + hy, 12, 4, H); R(13, 5 + hy, 6, 6, H); set(9, 0 + hy, H); set(12, 0 + hy, H); set(15, 0 + hy, H); }
        if (hs === 'bun') { R(11, -1 + hy, 4, 2, H); R(10, 0 + hy, 6, 1, H); }
        if (hs === 'ponytail') { R(16, 8 + hy, 3, 8, H); R(16, 15 + hy, 3, 1, HD); }
      }
    } else { R(9, 2 + hy, 3, 1, skL); }
  }
  // head covering / hat
  if (o.hat) {
    const C = o.hat, CD = shade(C, -34), CL = shade(C, 26);
    if (o.hatStyle === 'scarf') {
      if (!side) { R(6, 1 + hy, 12, 4, C); R(5, 3 + hy, 14, 3, C); R(5, 6 + hy, 3, 8, C); R(16, 6 + hy, 3, 8, C); if (!back) { R(8, 5 + hy, 8, 2, H); R(8, 5 + hy, 8, 1, HD); set(7, 6 + hy, H); set(16, 6 + hy, H); R(8, 4 + hy, 8, 1, CD); } else R(8, 5 + hy, 8, 1, CD); R(7, 12 + hy, 3, 3, CD); R(14, 12 + hy, 3, 3, CD); R(8, 2 + hy, 3, 1, CL); for (const [fx, fy] of [[7, 2], [10, 3], [13, 2], [16, 3], [6, 8], [17, 9], [6, 11], [17, 12]]) set(fx, fy + hy, CD); if (back) { R(5, 3 + hy, 14, 12, C); R(11, 11 + hy, 2, 4, CD); for (const fx of [8, 12, 15]) R(fx, 6 + hy, 1, 5, CD); } }
      else { R(8, 1 + hy, 10, 5, C); R(7, 3 + hy, 3, 8, C); R(12, 5 + hy, 6, 9, C); R(8, 5 + hy, 8, 1, CD); R(10, 2 + hy, 3, 1, CL); R(13, 13 + hy, 4, 2, CD); }
    } else if (o.hatStyle === 'kippah') {
      if (!side) { R(9, 1 + hy, 6, 1, C); R(8, 2 + hy, 8, 2, C); R(9, 4 + hy, 6, 1, CD); set(10, 1 + hy, CL); }
      else { R(10, 1 + hy, 6, 1, C); R(9, 2 + hy, 8, 2, C); R(10, 4 + hy, 6, 1, CD); }
    } else {
      if (!side) { R(6, 1 + hy, 12, 4, C); R(5, 5 + hy, 14, 1, CD); R(8, 1 + hy, 3, 1, CL); if (!back) R(7, 6 + hy, 10, 1, CD); }
      else { R(8, 1 + hy, 10, 4, C); R(5, 5 + hy, 8, 1, CD); }
    }
  }
  // glasses / beard
  const glasses = o.accessory === 'glasses' || o.accessory === 'both', cat = o.accessory === 'catglasses', beard = o.accessory === 'beard' || o.accessory === 'both';
  if (!back) {
    if (!side) {
      if (glasses) { const fr = '#20202c'; R(8, 7 + hy, 4, 1, fr); R(8, 10 + hy, 4, 1, fr); R(8, 7 + hy, 1, 4, fr); R(11, 7 + hy, 1, 4, fr); R(13, 7 + hy, 4, 1, fr); R(13, 10 + hy, 4, 1, fr); R(13, 7 + hy, 1, 4, fr); R(16, 7 + hy, 1, 4, fr); set(12, 8 + hy, fr); R(6, 8 + hy, 2, 1, fr); R(17, 8 + hy, 1, 1, fr); }
      if (cat) { const fr = '#101014'; R(7, 7 + hy, 5, 2, fr); R(13, 7 + hy, 5, 2, fr); R(8, 9 + hy, 1, 2, fr); R(11, 9 + hy, 1, 2, fr); R(14, 9 + hy, 1, 2, fr); R(17, 9 + hy, 1, 2, fr); R(9, 10 + hy, 2, 1, fr); R(15, 10 + hy, 2, 1, fr); set(6, 6 + hy, fr); set(7, 6 + hy, fr); set(17, 6 + hy, fr); set(18, 6 + hy, fr); R(12, 8 + hy, 1, 1, fr); set(9, 9 + hy, '#ffffff'); set(15, 9 + hy, '#ffffff'); }
      if (beard) { const B = o.beardColor || H, BD = shade(B, -30); R(7, 11 + hy, 10, 2, B); R(8, 13 + hy, 8, 1, BD); R(10, 11 + hy, 4, 1, '#c9605a'); R(9, 10 + hy, 6, 1, BD); R(10, 12 + hy, 4, 1, B); }
    } else {
      if (glasses) { const fr = '#20202c'; R(7, 7 + hy, 4, 1, fr); R(7, 10 + hy, 4, 1, fr); R(7, 7 + hy, 1, 4, fr); R(10, 7 + hy, 1, 4, fr); R(11, 8 + hy, 3, 1, fr); }
      if (cat) { const fr = '#101014'; R(7, 7 + hy, 4, 2, fr); R(7, 9 + hy, 1, 2, fr); R(10, 9 + hy, 1, 2, fr); R(8, 10 + hy, 2, 1, fr); R(11, 8 + hy, 3, 1, fr); set(10, 6 + hy, fr); }
      if (beard) { const B = o.beardColor || H; R(7, 10 + hy, 6, 3, B); R(8, 13 + hy, 4, 1, shade(B, -30)); }
    }
  }

  // more accessories
  if (!back) {
    if (!side) {
      if (o.accessory === 'sunglasses') { const fr = '#0c0c14'; R(7, 7 + hy, 5, 4, fr); R(13, 7 + hy, 5, 4, fr); R(12, 8 + hy, 1, 1, fr); set(8, 8 + hy, '#3a3a52'); set(14, 8 + hy, '#3a3a52'); }
      if (o.accessory === 'round') { const fr = '#3a2a1a'; for (const x0 of [8, 14]) { R(x0, 7 + hy, 3, 1, fr); R(x0, 10 + hy, 3, 1, fr); R(x0 - 1, 8 + hy, 1, 2, fr); R(x0 + 3, 8 + hy, 1, 2, fr); } set(12, 8 + hy, fr); }
      if (ex.has('freckles')) for (const [fx, fy] of [[8, 10], [10, 11], [14, 10], [16, 11], [9, 11], [15, 11]]) set(fx, fy + hy, skD);
      if (ex.has('earrings')) { set(5, 11 + hy, '#ffd23f'); set(18, 11 + hy, '#ffd23f'); }
      if (ex.has('mustache')) { R(9, 10 + hy, 6, 1, HD); set(8, 11 + hy, HD); set(15, 11 + hy, HD); }
      if (ex.has('headphones')) { R(5, 2 + hy, 14, 1, '#2b2b36'); R(4, 4 + hy, 2, 6, '#e84b4b'); R(18, 4 + hy, 2, 6, '#e84b4b'); R(4, 4 + hy, 1, 6, '#9a2a2a'); }
    } else {
      if (o.accessory === 'sunglasses') R(7, 7 + hy, 5, 4, '#0c0c14');
      if (ex.has('earrings')) set(13, 11 + hy, '#ffd23f');
      if (ex.has('headphones')) { R(9, 2 + hy, 8, 1, '#2b2b36'); R(11, 5 + hy, 3, 5, '#e84b4b'); }
    }
  }
  if (!side) {
    if (ex.has('necklace')) { for (const [nx, ny] of [[9, 16], [10, 17], [11, 17], [12, 17], [13, 17], [14, 16]]) set(nx, ny + bob, '#ffd23f'); set(11, 18 + bob, '#7be0ff'); set(12, 18 + bob, '#7be0ff'); }
    if (ex.has('bowtie')) { R(9, 15 + bob, 2, 2, '#e84b4b'); R(13, 15 + bob, 2, 2, '#e84b4b'); R(11, 15 + bob, 2, 2, '#9a2a2a'); }
  }

  // ---------------------------------------------------------------- outline + blit
  const filled = g.map((row) => row.map((c) => c != null));
  for (let y = 0; y < CHAR_H; y++) for (let x = 0; x < CHAR_W; x++) {
    if (filled[y][x]) continue;
    if ((y > 0 && filled[y - 1][x]) || (y < CHAR_H - 1 && filled[y + 1][x]) || (x > 0 && filled[y][x - 1]) || (x < CHAR_W - 1 && filled[y][x + 1])) g[y][x] = OUT;
  }
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(ox + 6, oy + 32, 12, 2); ctx.fillRect(ox + 8, oy + 31, 8, 1); ctx.fillRect(ox + 8, oy + 34 - 1, 8, 1);
  for (let y = 0; y < CHAR_H; y++) for (let x = 0; x < CHAR_W; x++) if (g[y][x]) { ctx.fillStyle = g[y][x]; ctx.fillRect(ox + x, oy + y, 1, 1); }
}
