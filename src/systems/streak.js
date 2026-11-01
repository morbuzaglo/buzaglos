// Daily streak (Duolingo style): one stage per day, a streak counter, freezes. Logic only (no DOM, no Phaser).
// A day only counts as "missed" if the player really had a stage waiting that day (a stage is stamped with the day it was added).
// So if no new stage is published, nobody loses a freeze or the streak.
import { content } from '../content.js';
import { isRestDay as shabbatRest } from './shabbat.js';
import { S, emit, saveGame, getCloudCode, cloudEnabled, equippedLook } from '../state.js';

export const FREEZE_PRICE = 60;          // coins
export const FREEZE_MAX = 2;             // freezes a player can hold
export const FREEZE_EVERY = 7;           // a free freeze every N streak days
const DAY = 86400000;

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const dayNum = (key) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); };
export const dayFromNum = (n) => { const d = new Date(n * DAY); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };

// days the admin declared "no streak required" (cached so it also works offline)
let freeDays = new Set();
try { freeDays = new Set(JSON.parse(localStorage.getItem('bz-freedays') || '[]').map((d) => dayNum(d))); } catch (e) { /* none */ }
const isRestDay = (n) => shabbatRest(n) || freeDays.has(n);
export const setFreeDays = (dates) => { freeDays = new Set(dates.map(dayNum)); };
export async function loadFreeDays() {
  if (!cloudEnabled()) return;
  try {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 3000);
    const r = await fetch(`${content.config.apiUrl.replace(/\/$/, '')}/api/freedays`, { signal: ctl.signal }); clearTimeout(to);
    if (!r.ok) return;
    const dates = ((await r.json()).days || []).map((d) => d.date).filter((d) => /^\d{4}-\d\d-\d\d$/.test(d));
    freeDays = new Set(dates.map(dayNum)); localStorage.setItem('bz-freedays', JSON.stringify(dates));
  } catch (e) { /* offline: use the cached list */ }
}
export const blank = () => ({ count: 0, best: 0, freezes: 0, lastDay: null, lost: null, appliedSeq: 0 });
export function ensure() { return (S.state.streak ||= blank()); }
export const info = () => ensure();

const stages = () => Object.values(content.quests).filter((q) => q.scene);
const unfinished = () => stages().filter((q) => S.state.quests[q.id]?.state !== 'done');

/** The first day that can count as missed: the day AFTER the oldest waiting stage was added (the day it appears is a free day). */
function firstMissable(today) {
  const days = unfinished().map((q) => dayNum(q.addedOn || today));
  return days.length ? Math.min(...days) + 1 : Infinity;
}

/** Applies freezes / loss for the days that passed. Safe to call any number of times. Returns the events to tell the player about. */
export function settle(now = Date.now()) {
  const s = ensure(), today = dayNum(dayKey(now)), ev = [];
  if (!s.lastDay || !(s.count > 0)) return ev;
  const start = Math.max(dayNum(s.lastDay) + 1, firstMissable(dayKey(now)));
  let missed = 0;                                      // days start .. today-1, except Friday and Shabbat (the game is closed then)
  for (let d = start; d < today; d++) if (!isRestDay(d)) missed++;
  if (missed <= 0) return ev;
  if (s.freezes >= missed) {
    s.freezes -= missed; s.lastDay = dayFromNum(today - 1);
    ev.push({ type: 'froze', n: missed, left: s.freezes });
  } else {
    s.lost = { count: s.count, day: dayKey(now), freezes: s.freezes };
    s.count = 0; s.freezes = 0; s.lastDay = null;
    ev.push({ type: 'lost', count: s.lost.count });
  }
  return ev;
}

/** Has the player already finished a stage today? */
export const doneToday = (now = Date.now()) => ensure().lastDay === dayKey(now);
/** Can a new stage be started right now? */
export const canPlayToday = (now = Date.now()) => !doneToday(now);
/** Hours/minutes until the next circle opens (local midnight). */
export function untilTomorrow(now = Date.now()) {
  const d = new Date(now); const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  const m = Math.max(1, Math.ceil((next - now) / 60000)); return { h: Math.floor(m / 60), m: m % 60 };
}

/** Called when a stage is finished for real (not a replay). */
export function stageDone(now = Date.now()) {
  const s = ensure(), today = dayKey(now), ev = settle(now);
  if (s.lastDay !== today) {
    s.count++; s.best = Math.max(s.best || 0, s.count); s.lastDay = today;
    if (s.count % FREEZE_EVERY === 0 && s.freezes < FREEZE_MAX) { s.freezes++; ev.push({ type: 'gift' }); }
    ev.push({ type: 'up', count: s.count });
  }
  emit('streak', ev); pushSoon();
  return ev;
}

export function buyFreeze() {
  const s = ensure();
  if (s.freezes >= FREEZE_MAX) return { ok: false, code: 'full' };
  if (S.state.coins < FREEZE_PRICE) return { ok: false, code: 'noCoins' };
  S.state.coins -= FREEZE_PRICE; s.freezes++;
  emit('coins', -FREEZE_PRICE); emit('streak', []); saveGame(); pushSoon();
  return { ok: true, code: 'bought' };
}

/** The state of the circle the player stands on today. */
export function todayStatus(now = Date.now()) {
  const left = unfinished();
  if (!left.length) return 'none';          // nothing waiting (the admin has not added a stage yet)
  return canPlayToday(now) ? 'open' : 'wait';
}

// ------------------------------------------------------------ server sync (admin sees it; leaderboard; admin can restore a streak)
const base = () => content.config.apiUrl.replace(/\/$/, '');
const keyOf = () => `${getCloudCode()}-${S.state.activeChar}`;
const syncOn = () => cloudEnabled() && S.started && S.state.activeChar !== 'visitor';
let timer = null;
export function pushSoon() { if (!syncOn()) return; clearTimeout(timer); timer = setTimeout(() => sync(), 1500); }
function summary() {
  const s = ensure(), c = content.characters[S.state.activeChar] || {};
  return { char: S.state.activeChar, name: c.name || S.state.activeChar, coins: S.state.coins, level: S.state.level, shards: S.state.shards.length, look: equippedLook(S.state.activeChar), ...s };
}
/** Applies what the admin decided (restore / set) when the server has a newer instruction. */
function applyOverride(o) {
  const s = ensure(); if (!o || !(o.seq > (s.appliedSeq || 0))) return false;
  if (o.count != null) s.count = o.count;
  if (o.freezes != null) s.freezes = o.freezes;
  s.best = Math.max(s.best || 0, s.count);
  if (s.count > 0 && o.count != null) s.lastDay = s.lastDay === dayKey() ? s.lastDay : dayFromNum(dayNum(dayKey()) - 1);
  if (o.restored && s.lost) s.lost = { ...s.lost, restored: true };
  s.appliedSeq = o.seq; return true;
}
export async function sync(keepalive = false) {
  if (!syncOn()) return false;
  try {
    const r = await fetch(`${base()}/api/streak/${encodeURIComponent(keyOf())}`, { method: 'PUT', keepalive, headers: { 'content-type': 'application/json' }, body: JSON.stringify(summary()) });
    if (!r.ok) return false;
    const rec = await r.json();
    if (applyOverride(rec.override)) { saveGame(); emit('streak', []); await sync(); }
    return true;
  } catch (e) { return false; }
}
/** On opening the game: settle the days that passed, then tell the server (and take admin changes). */
export async function start() {
  await loadFreeDays();
  const ev = settle(); ensure();
  if (ev.length) { emit('streak', ev); saveGame(); }
  await sync();
  return ev;
}

export async function leaderboard() {
  if (!cloudEnabled()) return [];
  try { const r = await fetch(`${base()}/api/leaderboard`); return r.ok ? (await r.json()).players || [] : []; } catch (e) { return []; }
}
