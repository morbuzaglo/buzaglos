// Builds src/data/shabbat.json: every Shabbat from candle lighting (Friday) to Havdalah (Saturday night), from the Hebcal calendar API.
//   node tools/gen_shabbat.mjs [geonameid=281184 (Jerusalem)] [candleMinutesBeforeSunset=40] [firstYear=2026] [lastYear=2031]
// Other Israeli cities: Tel Aviv 293397 (18 min), Haifa 294801 (30 min), Be'er Sheva 295530 (18 min). Havdalah = nightfall (8.5 degrees below the horizon, the Hebcal default).
import fs from 'node:fs';
const [geo = '281184', mins = '40', y0 = '2026', y1 = '2031'] = process.argv.slice(2);
const windows = []; let place = '';
for (let y = +y0; y <= +y1; y++) {
  const r = await fetch(`https://www.hebcal.com/hebcal?v=1&cfg=json&year=${y}&c=on&geonameid=${geo}&M=on&b=${mins}&ss=off&mf=off&nx=off&mod=off&min=off&maj=off&i=on&lg=en`);
  if (!r.ok) throw new Error('Hebcal error ' + r.status);
  const d = await r.json(); place = d.location.title;
  const items = d.items.filter((i) => i.category === 'candles' || i.category === 'havdalah');
  for (let k = 0; k < items.length - 1; k++) {
    const a = items[k], b = items[k + 1];
    if (a.category !== 'candles' || b.category !== 'havdalah') continue;
    const from = new Date(a.date), to = new Date(b.date);
    if (from.getUTCDay() !== 5 && from.getUTCDay() !== 4) continue;          // Friday evening (Israel is ahead of UTC, so a Friday 16:00 is still Friday in UTC)
    if ((to - from) / 36e5 > 80 || (to - from) / 36e5 < 20) continue;
    windows.push([Math.round(+from / 1000), Math.round(+to / 1000)]);
  }
}
windows.sort((a, b) => a[0] - b[0]);
const out = { place, candleMinutes: +mins, havdalah: 'nightfall 8.5 degrees', windows };
fs.writeFileSync(new URL('../src/data/shabbat.json', import.meta.url), JSON.stringify(out) + '\n');
console.log(place, windows.length, 'Shabbatot', new Date(windows[0][0] * 1000).toISOString(), '->', new Date(windows.at(-1)[1] * 1000).toISOString());
