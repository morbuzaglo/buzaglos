// Generates the PWA icons (PNG) with no dependencies: a pixel-art Memory Shard on a purple tile.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ART = [
  '................',
  '......GGGG......',
  '....GGyyyyGG....',
  '...GyyCCCCyyG...',
  '..GyCCwwCCCCyG..',
  '..GyCwwCCCCCyG..',
  '.GyCCCCCCCCDCyG.',
  '.GyCCCCCCCDDCyG.',
  '..GyCCCCCDDDyG..',
  '..GyyCCCDDDyyG..',
  '...GyyCDDDyyG...',
  '....GGyDDyGG....',
  '......GyyG......',
  '.......GG.......',
  '................',
  '................',
];
const PAL = { G: [255, 210, 63], y: [255, 243, 160], C: [79, 195, 247], w: [230, 251, 255], D: [43, 143, 201] };

function png(size) {
  const px = Buffer.alloc(size * size * 4);
  const scale = Math.floor(size / 20);
  const off = Math.floor((size - 16 * scale) / 2);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const t = y / size;
    let c = [Math.round(75 - 48 * t), Math.round(42 - 26 * t), Math.round(143 - 92 * t)];       // purple gradient
    const ax = Math.floor((x - off) / scale), ay = Math.floor((y - off) / scale);
    if (ax >= 0 && ax < 16 && ay >= 0 && ay < 16) { const ch = ART[ay][ax]; if (PAL[ch]) c = PAL[ch]; }
    const i = (y * size + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, '..', 'public', 'icons');
fs.mkdirSync(dir, { recursive: true });
for (const s of [180, 192, 512]) fs.writeFileSync(path.join(dir, `icon-${s}.png`), png(s));
console.log('icons written');
