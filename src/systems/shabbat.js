// The game is closed on Shabbat: from candle lighting on Friday until Havdalah on Saturday night (times from Hebcal, see tools/gen_shabbat.mjs).
import data from '../data/shabbat.json';

/** The Shabbat window [from, to) in seconds that contains this moment, or null. */
export function current(now = Date.now()) {
  const t = now / 1000;
  const w = data.windows.find(([a, b]) => t >= a && t < b);
  return w ? { from: w[0] * 1000, to: w[1] * 1000 } : null;
}
export function next(now = Date.now()) {
  const t = now / 1000, w = data.windows.find(([a]) => a > t);
  return w ? { from: w[0] * 1000, to: w[1] * 1000 } : null;
}
export const place = () => data.place;
const fmt = (ms, opt) => new Date(ms).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', ...opt });
export const clock = (ms) => fmt(ms, { hour: '2-digit', minute: '2-digit' });
export const dayName = (ms) => fmt(ms, { weekday: 'long' });
/** Days that never count as missed for the streak: Friday and Shabbat (the game is closed for part of Friday and all of Shabbat). */
export const isRestDay = (dayNumber) => { const wd = (dayNumber + 4) % 7; return wd === 5 || wd === 6; };   // day 0 (1970-01-01) was a Thursday; 0 = Sunday
