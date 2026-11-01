// Unit test of the daily streak rules.  node tools/test_streak.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let fails = 0; const t = (n, c, i = '') => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n, i); };

// a tiny harness that exposes the streak module, the game state and the content
const harness = path.join(os.tmpdir(), 'bz-streak-harness.mjs');
fs.writeFileSync(path.join(root, 'tools', '.streak_h.js'), "export * as Streak from '../src/systems/streak.js'; export { S } from '../src/state.js'; export { content } from '../src/content.js';\n");
await build({ entryPoints: [root + 'tools/.streak_h.js'], bundle: true, format: 'esm', outfile: harness, platform: 'node', logLevel: 'error', loader: { '.json': 'json' }, banner: { js: "globalThis.location = { search: '' }; globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };" } });
fs.unlinkSync(path.join(root, 'tools', '.streak_h.js'));
const H = await import(pathToFileURL(harness).href + '?h');
const { Streak: St, S: state, content: cc } = H;

const at = (day, h = 12) => new Date(`${day}T${String(h).padStart(2, '0')}:00:00`).getTime();
const reset = () => { state.state.streak = { count: 0, best: 0, freezes: 0, lastDay: null, lost: null, appliedSeq: 0 }; state.state.quests = {}; state.started = false; };
// all stages were added on 2026-11-01
const stages = Object.values(cc.quests).filter((q) => q.scene);
const finish = (n) => { stages.slice(0, n).forEach((q) => { state.state.quests[q.id] = { state: 'done' }; }); };

reset(); finish(1); St.stageDone(at('2026-11-02'));
t('first stage starts a streak of 1', St.info().count === 1 && St.info().lastDay === '2026-11-02');
t('cannot play a second stage the same day', !St.canPlayToday(at('2026-11-02', 20)));
t('can play the next day', St.canPlayToday(at('2026-11-03', 8)));
finish(2); St.stageDone(at('2026-11-03'));
t('next day -> streak 2', St.info().count === 2);

// missing one day with no freeze loses the streak
let ev = St.settle(at('2026-11-05'));
t('missing a day without a freeze loses the streak', ev[0]?.type === 'lost' && St.info().count === 0 && St.info().lost.count === 2, JSON.stringify(ev));

// one freeze covers one missed day
reset(); finish(1); St.stageDone(at('2026-11-02')); St.info().freezes = 1;
ev = St.settle(at('2026-11-04'));
t('a freeze covers one missed day', ev[0]?.type === 'froze' && St.info().count === 1 && St.info().freezes === 0, JSON.stringify(ev));
t('settle is idempotent', St.settle(at('2026-11-04', 18)).length === 0);
ev = St.settle(at('2026-11-06'));
t('then 2 more missed days without a freeze lose it', ev[0]?.type === 'lost' && St.info().count === 0);

// no stage waiting -> nothing is lost
reset(); stages.forEach((q) => { state.state.quests[q.id] = { state: 'done' }; }); Object.assign(St.info(), { count: 5, lastDay: '2026-11-02' });
ev = St.settle(at('2026-11-20'));
t('no stage waiting: streak and freezes are safe', ev.length === 0 && St.info().count === 5);
t('todayStatus none when nothing is waiting', St.todayStatus(at('2026-11-20')) === 'none');

// a stage added late only counts days after it appeared
reset(); finish(stages.length - 1); const last = stages[stages.length - 1]; const keep = last.addedOn; last.addedOn = '2026-11-10';
Object.assign(St.info(), { count: 5, lastDay: '2026-11-02' });
ev = St.settle(at('2026-11-11'));
t('stage added 11-10: 11-10 itself is a free day', ev.length === 0 && St.info().count === 5);
ev = St.settle(at('2026-11-12'));
t('stage added 11-10: missing 11-11 loses the streak', ev[0]?.type === 'lost');
last.addedOn = keep;

// every 7th day gives a freeze (max 2)
reset(); Object.assign(St.info(), { count: 6, lastDay: '2026-11-08', freezes: 0 }); finish(3);
ev = St.stageDone(at('2026-11-09'));
t('7-day streak gifts a freeze', St.info().count === 7 && St.info().freezes === 1 && ev.some((e) => e.type === 'gift'));

// Friday and Shabbat never count as missed (the game is closed then)
const dow = (d) => new Date(d + 'T12:00:00').getDay();
t('test dates: 2026-11-05 is a Thursday', dow('2026-11-05') === 4);
reset(); finish(1); Object.assign(St.info(), { count: 3, lastDay: '2026-11-05' });
ev = St.settle(at('2026-11-08'));
t('Thursday -> Sunday: Friday and Shabbat are free', ev.length === 0 && St.info().count === 3, JSON.stringify(ev));
ev = St.settle(at('2026-11-09'));
t('...but missing the Sunday still loses it', ev[0]?.type === 'lost');

// buying a freeze
reset(); state.state.coins = 100; let b = St.buyFreeze(); t('buy a freeze for coins', b.ok && St.info().freezes === 1 && state.state.coins === 100 - St.FREEZE_PRICE);
state.state.coins = 1000; St.buyFreeze(); b = St.buyFreeze(); t('cannot hold more than the max', !b.ok && St.info().freezes === St.FREEZE_MAX);
reset(); state.state.coins = 10; t('not enough coins', !St.buyFreeze().ok);
console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
