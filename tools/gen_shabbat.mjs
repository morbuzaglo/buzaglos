// Builds src/data/shabbat.json: every Shabbat AND every holiday (Yom Tov), from candle lighting to Havdalah, from the Hebcal calendar API.
//   node tools/gen_shabbat.mjs [geonameid=281184 (Jerusalem)] [candleMinutesBeforeSunset=40] [firstYear=2026] [lastYear=2031]
// Other Israeli cities: Tel Aviv 293397 (18 min), Haifa 294801 (30 min), Be'er Sheva 295530 (18 min). Havdalah = nightfall (8.5 degrees below the horizon, the Hebcal default).
import fs from 'node:fs';
const [geo = '281184', mins = '40', y0 = '2026', y1 = '2031'] = process.argv.slice(2);
const events = []; let place = '';
for (let y = +y0; y <= +y1; y++) {
  const r = await fetch(`https://www.hebcal.com/hebcal?v=1&cfg=json&year=${y}&c=on&geonameid=${geo}&M=on&b=${mins}&maj=on&ss=off&mf=off&nx=off&mod=off&min=off&i=on&lg=en`);
  if (!r.ok) throw new Error('Hebcal error ' + r.status);
  const d = await r.json(); place = d.location.title;
  for (const i of d.items) if (i.category === 'candles' || i.category === 'havdalah') events.push({ kind: i.category, t: Math.round(+new Date(i.date) / 1000) });
}
events.sort((a, b) => a.t - b.t);
// A window opens at candle lighting and closes at the next Havdalah (holidays that touch Shabbat or each other merge into one window).
// kind: 'S' = a plain Shabbat, 'H' = it includes a holiday.
const windows = [];
for (let k = 0; k < events.length; k++) {
  if (events[k].kind !== 'candles') continue;
  const end = events.slice(k + 1).find((e) => e.kind === 'havdalah'); if (!end) break;
  const from = events[k].t, to = end.t, plain = new Date(from * 1000).getUTCDay() === 5 && (to - from) / 3600 < 30;
  windows.push([from, to, plain ? 'S' : 'H']);
  while (k + 1 < events.length && events[k + 1].t < to) k++;
}
windows.sort((a, b) => a[0] - b[0]);
const out = { place, candleMinutes: +mins, havdalah: 'nightfall 8.5 degrees', windows };
fs.writeFileSync(new URL('../src/data/shabbat.json', import.meta.url), JSON.stringify(out) + '\n');
console.log(place, windows.length, 'windows (' + windows.filter((w) => w[2] === 'H').length + ' with holidays)', new Date(windows[0][0] * 1000).toISOString(), '->', new Date(windows.at(-1)[1] * 1000).toISOString());
