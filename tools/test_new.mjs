// Tests ONLY the levels that are new or changed since they last passed (never the whole game).
//   node tools/test_new.mjs            -> new/changed levels (static checks + a full automated playthrough as the hero and as another family member)
//   node tools/test_new.mjs q_a q_b    -> exactly these levels
//   node tools/test_new.mjs --list     -> show which levels would be tested
//   node tools/test_new.mjs --static   -> static checks only (fast)
//   node tools/test_new.mjs --mark q_a q_b -> record these levels as already passed (use once for levels tested by hand)
// A level passes when validation has no errors and it can be played to its end (memory shard awarded) with no script errors.
// Passing levels are remembered in tools/tested_levels.json (keyed by a hash of the level, its scenes and its characters), so unchanged levels are skipped next time.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateContent } from '../src/shared/validate.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const rd = (n) => JSON.parse(fs.readFileSync(root + 'content/' + n + '.json', 'utf8'));
const content = {}; for (const n of ['characters', 'npcs', 'items', 'quests', 'dialogues', 'maps', 'shop', 'achievements', 'config']) content[n] = rd(n);
const regFile = root + 'tools/tested_levels.json';
const reg = fs.existsSync(regFile) ? JSON.parse(fs.readFileSync(regFile, 'utf8')) : {};
const args = process.argv.slice(2);
const levels = Object.values(content.quests).filter((q) => q.scene);

const hashOf = (q) => {
  const maps = (q.maps || [q.scene.map]).map((m) => content.maps[m]);
  const ids = new Set(maps.flatMap((m) => (m?.npcs || []).map((n) => n.id)));
  const npcs = [...ids].map((i) => content.npcs[i]);
  const items = Object.fromEntries(Object.entries(content.items).filter(([id]) => JSON.stringify(q).includes(id)));
  return crypto.createHash('sha1').update(JSON.stringify([q, maps, npcs, items])).digest('hex').slice(0, 16);
};

if (args[0] === '--mark') { for (const id of args.slice(1)) if (content.quests[id]) reg[id] = hashOf(content.quests[id]); fs.writeFileSync(regFile, JSON.stringify(reg, null, 1) + '\n'); console.log('marked', args.slice(1).join(', ')); process.exit(0); }
let todo = args.filter((a) => !a.startsWith('--')).length ? levels.filter((q) => args.includes(q.id)) : levels.filter((q) => reg[q.id] !== hashOf(q));
if (args.includes('--list')) { console.log('to test:', todo.map((q) => q.id).join(', ') || '(nothing: all levels already passed unchanged)'); process.exit(0); }
if (!todo.length) { console.log('Nothing to test: every level is unchanged since it last passed.'); process.exit(0); }

const v = validateContent(content);
if (v.errors.length) { console.log('VALIDATION ERRORS:\n- ' + v.errors.join('\n- ')); process.exit(1); }
console.log(`validation ok. testing: ${todo.map((q) => q.id).join(', ')}`);
if (args.includes('--static')) process.exit(0);

const npmBuild = spawnSync('npm', ['run', 'build'], { cwd: root, shell: true, encoding: 'utf8' });
if (npmBuild.status !== 0) { console.log(npmBuild.stdout + npmBuild.stderr); process.exit(1); }
const up = async () => { try { return (await fetch('http://localhost:4173/')).ok; } catch { return false; } };
let server = null;
if (!(await up())) { server = spawn('npx', ['vite', 'preview', '--port', '4173'], { cwd: root, shell: true, stdio: 'ignore' }); for (let i = 0; i < 40 && !(await up()); i++) await new Promise((r) => setTimeout(r, 500)); }

const tmp = root + 'tools/tmp/'; fs.mkdirSync(tmp, { recursive: true });
const playerFor = (q, asHero) => {
  const hero = q.protagonist || q.callers?.[0], all = Object.keys(content.characters);
  if (asHero) return hero;
  return all.find((c) => c !== hero && !(q.cast || []).includes(c)) || all.find((c) => c !== hero);
};
const run = (q, who) => new Promise((resolve) => {
  const solveJs = `(async()=>{ window.__bzTest={autowin:{drive:true,sequence:true}}; await T.skipIntro(); const {S,content}=__bz; for(const x of Object.values(content.quests)) if(x.scene&&x.id!=='${q.id}') S.state.quests[x.id]={state:'done'}; T.tp('house',9,12); await T.sleep(2500); await T.click(15); const w=T.w(); w.busy=false; await T.sleep(600); w.enterStory('${q.id}'); await T.sleep(2500);
    const log=[]; const t0=Date.now(); const p=T.solve('${q.id}',log); const res=await Promise.race([p, new Promise(r=>setTimeout(()=>r('timeout'),150000))]);
    return 'RESULT:'+JSON.stringify({state:S.state.quests['${q.id}']?.state, res, shard:S.state.shards.includes(content.quests['${q.id}'].reward?.shard?.id), secs:Math.round((Date.now()-t0)/1000), last:log.slice(-2)}) })()`;
  const steps = [{ js: `window.__who='${who}'; 1`, wait: 200 }, { file: root + 'tools/test_helpers.js', wait: 100 }, { js: solveJs, wait: 300 }];
  const f = tmp + `steps_${q.id}_${who}.json`; fs.writeFileSync(f, JSON.stringify(steps));
  const p = spawn('node', [root + 'tools/shot.mjs', 'http://localhost:4173/', tmp + 'ignore', '--steps', f], { cwd: root });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
  const to = setTimeout(() => p.kill(), 200000);
  p.on('close', () => { clearTimeout(to); const m = /RESULT:(\{.*?\})/.exec(out.replace(/\\"/g, '"')); const errs = out.split('\n').filter((l) => /EXCEPTION|js error/.test(l)); resolve({ result: m ? JSON.parse(m[1]) : null, errs }); });
});

let failed = 0;
for (const q of todo) {
  let ok = true;
  for (const asHero of [true, false]) {
    const who = playerFor(q, asHero);
    const { result, errs } = await run(q, who);
    const pass = result && result.state === 'done' && result.shard !== false && !errs.length;
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${q.id} as ${who} (${asHero ? 'hero' : 'helper'})`, result ? `${result.secs}s` : 'no result', errs.slice(0, 2).join(' | '), pass ? '' : JSON.stringify(result));
    if (!pass) ok = false;
  }
  if (ok) { reg[q.id] = hashOf(q); fs.writeFileSync(regFile, JSON.stringify(reg, null, 1) + '\n'); } else failed++;
}
if (server) server.kill();
console.log(failed ? `${failed} level(s) FAILED` : 'all tested levels passed');
process.exit(failed ? 1 : 0);
