// The game is closed on Shabbat and on every holiday (Yom Tov): from candle lighting until Havdalah (times from Hebcal, see tools/gen_shabbat.mjs).
import data from '../data/shabbat.json';

/** The Shabbat window [from, to) in seconds that contains this moment, or null. */
export function current(now = Date.now()) {
  const t = now / 1000;
  const w = data.windows.find(([a, b]) => t >= a && t < b);
  return w ? { from: w[0] * 1000, to: w[1] * 1000, holiday: w[2] === 'H' } : null;
}
export function next(now = Date.now()) {
  const t = now / 1000, w = data.windows.find(([a]) => a > t);
  return w ? { from: w[0] * 1000, to: w[1] * 1000, holiday: w[2] === 'H' } : null;
}
export const place = () => data.place;
const fmt = (ms, opt) => new Date(ms).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', ...opt });
export const clock = (ms) => fmt(ms, { hour: '2-digit', minute: '2-digit' });
export const dayName = (ms) => fmt(ms, { weekday: 'long' });
const dayOf = (sec) => { const [y, m, d] = new Date(sec * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }).split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
let closedDays = null;
/** Days that never count as missed for the streak: Fridays, Shabbat, and every holiday day (the eve, the holiday itself and the day it ends), because the game is closed for all or part of them. */
export function isRestDay(dayNumber) {
  const wd = (dayNumber + 4) % 7;                       // day 0 (1970-01-01) was a Thursday; 0 = Sunday
  if (wd === 5 || wd === 6) return true;
  if (!closedDays) { closedDays = new Set(); for (const [a, b] of data.windows) for (let d = dayOf(a); d <= dayOf(b); d++) closedDays.add(d); }
  return closedDays.has(dayNumber);
}
