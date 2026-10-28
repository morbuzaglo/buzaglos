// Synthesized chiptune music + SFX with WebAudio. No audio files.
let ctx = null, master = null, musicGain = null, sfxGain = null;
let musicOn = true, sfxOn = true, timer = null, step = 0, currentTrack = null;

export function initAudio() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
}
export function resumeAudio() { if (ctx && ctx.state !== 'running') ctx.resume(); }
export function setMusic(on) { musicOn = on; if (!on) stopMusic(); else if (currentTrack) playMusic(currentTrack, true); }
export function setSfx(on) { sfxOn = on; }
export const audioSettings = () => ({ music: musicOn, sfx: sfxOn });

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freq(n) { // 'C4', 'F#3'
  const m = /^([A-G])(#|b)?(\d)$/.exec(n); if (!m) return 0;
  const semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
  return 440 * Math.pow(2, (semi - 69) / 12);
}
function tone(f, t, dur, type, vol, dest, slide = 0) {
  if (!ctx || !f) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}
function noise(t, dur, vol, dest) {
  if (!ctx) return;
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(dest); s.start(t);
}

// Tracks: bpm, melody (16 steps x bars), bass
const TRACKS = {
  home: { bpm: 112, lead: 'square', mel: ['E4 . G4 . A4 . G4 . E4 . D4 . C4 . . .', 'D4 . F4 . A4 . F4 . D4 . C4 . A3 . . .', 'E4 . G4 . B4 . G4 . A4 . G4 . E4 . . .', 'D4 . E4 . G4 . E4 . D4 . C4 . C4 . . .'], bass: ['C3', 'F3', 'A3', 'G3'] },
  town: { bpm: 126, lead: 'square', mel: ['G4 . B4 . D5 . B4 . G4 . A4 . B4 . . .', 'A4 . C5 . E5 . C5 . A4 . B4 . C5 . . .', 'G4 . B4 . D5 . E5 . D5 . B4 . G4 . . .', 'F#4 . A4 . D5 . A4 . F#4 . G4 . A4 . . .'], bass: ['G3', 'A3', 'E3', 'D3'] },
  beach: { bpm: 100, lead: 'triangle', mel: ['C5 . E5 . G5 . E5 . D5 . F5 . A5 . . .', 'B4 . D5 . G5 . D5 . C5 . E5 . G5 . . .', 'A4 . C5 . E5 . C5 . B4 . D5 . F5 . . .', 'G4 . B4 . D5 . B4 . C5 . . . . . . .'], bass: ['C3', 'G3', 'A3', 'F3'] },
  mystery: { bpm: 90, lead: 'sawtooth', mel: ['A3 . . C4 . . E4 . . D4 . . C4 . . .', 'F3 . . A3 . . C4 . . B3 . . A3 . . .', 'G3 . . B3 . . D4 . . C4 . . B3 . . .', 'E3 . . G3 . . B3 . . A3 . . . . . .'], bass: ['A2', 'F2', 'G2', 'E2'] },
};

export function playMusic(name, force) {
  currentTrack = name;
  if (!ctx || !musicOn) return;
  if (timer && !force && timer.name === name) return;
  stopMusic();
  const tr = TRACKS[name] || TRACKS.home;
  const stepDur = 60 / tr.bpm / 2;
  step = 0;
  const run = () => {
    const bar = ((step / 16) | 0) % tr.mel.length, i = step % 16;
    const note = tr.mel[bar].split(' ')[i];
    const t = ctx.currentTime + 0.05;
    if (note && note !== '.') tone(freq(note), t, stepDur * 1.8, tr.lead, 0.5, musicGain);
    if (i % 4 === 0) tone(freq(tr.bass[bar]), t, stepDur * 3.5, 'triangle', 0.8, musicGain);
    if (i % 2 === 0) noise(t, 0.03, i % 4 === 0 ? 0.25 : 0.1, musicGain);
    step++;
  };
  const id = setInterval(run, stepDur * 1000);
  timer = { id, name };
}
export function stopMusic() { if (timer) { clearInterval(timer.id); timer = null; } }

const SFX = {
  tap: (t) => tone(880, t, 0.06, 'square', 0.4, sfxGain),
  talk: (t) => { tone(500 + Math.random() * 200, t, 0.04, 'square', 0.3, sfxGain); },
  coin: (t) => { tone(988, t, 0.07, 'square', 0.4, sfxGain); tone(1319, t + 0.07, 0.18, 'square', 0.4, sfxGain); },
  pickup: (t) => { tone(660, t, 0.08, 'triangle', 0.5, sfxGain); tone(880, t + 0.08, 0.08, 'triangle', 0.5, sfxGain); tone(1320, t + 0.16, 0.14, 'triangle', 0.5, sfxGain); },
  shard: (t) => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.09, 0.3, 'square', 0.35, sfxGain)); },
  levelup: (t) => { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.1, 0.22, 'square', 0.4, sfxGain)); },
  ability: (t) => tone(300, t, 0.3, 'sawtooth', 0.35, sfxGain, 900),
  bad: (t) => { tone(200, t, 0.2, 'sawtooth', 0.4, sfxGain, -100); },
  door: (t) => { noise(t, 0.12, 0.35, sfxGain); tone(180, t, 0.12, 'square', 0.3, sfxGain, -60); },
  buy: (t) => { tone(784, t, 0.06, 'square', 0.4, sfxGain); tone(1046, t + 0.06, 0.06, 'square', 0.4, sfxGain); tone(1568, t + 0.12, 0.2, 'square', 0.4, sfxGain); },
  step: (t) => noise(t, 0.02, 0.06, sfxGain),
  achieve: (t) => { [659, 784, 988, 1318, 988, 1318].forEach((f, i) => tone(f, t + i * 0.08, 0.2, 'square', 0.35, sfxGain)); },
  win: (t) => { [523, 523, 523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.12, 0.25, 'square', 0.4, sfxGain)); },
};
export function sfx(name) {
  if (!ctx || !sfxOn || !SFX[name]) return;
  SFX[name](ctx.currentTime + 0.01);
}
