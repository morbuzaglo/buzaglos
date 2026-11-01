// Offline test of the Worker with mocked GitHub + Anthropic:  node worker/test.mjs
import fs from 'node:fs';
import worker from './src/index.js';

const dir = new URL('../content/', import.meta.url);
const disk = Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f, fs.readFileSync(new URL(f, dir), 'utf8')]));
const puts = []; let anthropicReply = '';
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  const ok = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
  if (url.includes('api.anthropic.com')) return ok({ content: [{ type: 'text', text: anthropicReply }] });
  const m = /repos\/[^/]+\/[^/]+\/contents\/(.*?)(\?|$)/.exec(url);
  if (m) {
    const p = m[1];
    if (p === 'content') return ok(Object.keys(disk).map((name) => ({ name, path: 'content/' + name })));
    const name = p.replace('content/', '');
    if (init.method === 'PUT') { puts.push({ name, body: JSON.parse(init.body) }); return ok({ ok: true }); }
    return disk[name] ? ok({ sha: 'sha-' + name, content: Buffer.from(disk[name]).toString('base64') }) : ok({}, 404);
  }
  return ok({}, 404);
};
const kv = new Map();
const env = { ADMIN_PASSWORD: 'secret-pw', SESSION_SECRET: 'x'.repeat(40), GITHUB_REPO: 'o/r', GITHUB_TOKEN: 't', ANTHROPIC_API_KEY: 'k', ALLOWED_ORIGIN: 'https://o.github.io',
  SAVES: { get: async (k, type) => { const v = kv.get(k) ?? null; return v != null && type === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => kv.set(k, v), list: async ({ prefix }) => ({ keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }) } };
const call = (path, { method = 'GET', body, token, origin = 'https://o.github.io' } = {}) => worker.fetch(new Request('https://api.test' + path, { method, headers: { origin, 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }), env);
let fails = 0; const t = (name, cond, info = '') => { if (!cond) fails++; console.log(cond ? 'PASS' : 'FAIL', name, info); };

let r = await call('/api/login', { method: 'POST', body: { password: 'nope' } }); t('login wrong password -> 401', r.status === 401);
r = await call('/api/login', { method: 'POST', body: { password: 'secret-pw' } }); const { token } = await r.json(); t('login ok -> token', r.status === 200 && token.includes('.'));
r = await call('/api/admin/content'); t('admin route without token -> 401', r.status === 401);
r = await call('/api/admin/content', { token: token + 'x' }); t('tampered token -> 401', r.status === 401);
r = await call('/api/admin/content', { token }); const c = await r.json(); t('read content from repo', r.status === 200 && !!c.files['quests.json']);
r = await call('/api/admin/content', { token, origin: 'https://evil.example' }); t('CORS: foreign origin gets no allow header', !r.headers.get('access-control-allow-origin'));

const goodBundle = { quests: { q_t1: { id: 'q_t1', title: 'מבחן', giver: 'anat', summary: 's', offer: [{ who: 'anat', text: '{f:תוכלי|m:תוכל} לעזור?' }], steps: [{ type: 'talk', npc: 'yitzhak', text: 'לדבר עם אבא', lines: [{ who: 'yitzhak', text: 'היי' }] }], reward: { coins: 20, xp: 20, shard: { id: 'shard_t1', title: 'ט', story: 'ס' } } } } };
anthropicReply = '```json\n' + JSON.stringify(goodBundle) + '\n```';
r = await call('/api/admin/generate', { method: 'POST', token, body: { story: 'סיפור מבחן שמכיל מספיק טקסט כדי לעבור', context: {} } }); let g = await r.json();
t('generate: valid bundle accepted', r.status === 200 && g.errors.length === 0, JSON.stringify(g.errors));
anthropicReply = JSON.stringify({ quests: { q_bad: { id: 'q_bad', title: 'x', giver: 'nobody', offer: [{ who: 'uncle', text: 'a' }], steps: [{ type: 'talk', npc: 'ghost', text: 't' }], reward: { coins: 99999 } } } });
r = await call('/api/admin/generate', { method: 'POST', token, body: { story: 'סיפור מבחן שמכיל מספיק טקסט כדי לעבור', context: {} } }); g = await r.json();
t('generate: invalid bundle reports errors', r.status === 200 && g.errors.length >= 3, `${g.errors.length} errors`);

const q = JSON.parse(disk['quests.json']); q.q_t1 = goodBundle.quests.q_t1;
r = await call('/api/admin/publish', { method: 'POST', token, body: { files: { 'quests.json': JSON.stringify(q) } } }); const p = await r.json();
t('publish: valid change commits the file', r.status === 200 && puts.length === 1 && puts[0].name === 'quests.json', JSON.stringify(p));
const q2 = JSON.parse(disk['quests.json']); q2.q_bad = { id: 'q_bad', title: 'x', giver: 'nobody', offer: [], steps: [] };
puts.length = 0; r = await call('/api/admin/publish', { method: 'POST', token, body: { files: { 'quests.json': JSON.stringify(q2) } } });
t('publish: invalid content rejected (422) and nothing committed', r.status === 422 && puts.length === 0);
r = await call('/api/admin/publish', { method: 'POST', token, body: { files: { '../evil.json': '{}' } } }); t('publish: path traversal rejected', r.status >= 400);

r = await call('/api/save/ABCDEFGH12', { method: 'PUT', body: { v: 1, coins: 5 } }); t('cloud save PUT', r.status === 200);
r = await call('/api/save/ABCDEFGH12'); t('cloud save GET', (await r.json()).coins === 5);
r = await call('/api/save/short'); t('save code too short -> 404', r.status === 404);

// streaks: mirror, leaderboard, admin view, restore
const K = 'buzaglosfam-eden';
r = await call('/api/streak/' + K, { method: 'PUT', body: { char: 'eden', name: 'עדן', coins: 50, level: 2, shards: 3, count: 12, best: 12, freezes: 1, lastDay: '2026-11-03', lost: null, appliedSeq: 0 } }); let rec = await r.json();
t('streak PUT stores the mirror', r.status === 200 && rec.count === 12);
r = await call('/api/streak/buzaglosfam-vabc12345', { method: 'PUT', body: { char: 'visitor', count: 5 } }); t('streak: guest keys rejected', r.status === 400);
r = await call('/api/leaderboard'); let lb = await r.json(); t('leaderboard lists players', lb.players.length === 1 && lb.players[0].count === 12 && lb.players[0].coins === 50);
r = await call('/api/streak/' + K, { method: 'PUT', body: { char: 'eden', name: 'עדן', coins: 50, level: 2, shards: 3, count: 12, best: 12, freezes: 1, lastDay: '2026-11-03', lost: null, appliedSeq: 0, look: { skin: '#f1c9a0', shirt: '#e84b4b', extras: ['earrings'], evil: { x: 1 }, 'bad key!': 'x' } } }); rec = await r.json();
t('look is stored and sanitised', rec.look.shirt === '#e84b4b' && rec.look.extras[0] === 'earrings' && !rec.look.evil && !rec.look['bad key!']);
r = await call('/api/leaderboard'); lb = await r.json(); t('leaderboard carries the look', lb.players[0].look?.skin === '#f1c9a0');
r = await call('/api/admin/streaks'); t('admin streaks needs a token', r.status === 401);
r = await call('/api/streak/' + K, { method: 'PUT', body: { char: 'eden', name: 'עדן', coins: 60, level: 2, shards: 3, count: 0, best: 12, freezes: 0, lastDay: null, lost: { count: 12, day: '2026-11-09', freezes: 0 }, appliedSeq: 0 } }); rec = await r.json();
t('streak loss is recorded', rec.count === 0 && rec.lost.count === 12);
r = await call('/api/admin/streaks', { token }); let as = await r.json(); t('admin sees the lost streak', as.players[0].lost.count === 12 && as.players[0].key === K);
r = await call('/api/admin/streak', { method: 'POST', token, body: { key: K, action: 'restore' } }); rec = (await r.json()).player; t('admin restore -> override', r.status === 200 && rec.override.count === 12 && rec.override.seq === 1);
r = await call('/api/streak/' + K, { method: 'PUT', body: { char: 'eden', name: 'עדן', coins: 70, level: 2, shards: 3, count: 0, best: 12, freezes: 0, lastDay: null, lost: { count: 12, day: '2026-11-09', freezes: 0 }, appliedSeq: 0 } }); rec = await r.json();
t('a stale phone cannot overwrite the restore', rec.count === 12 && rec.override.seq === 1 && rec.coins === 70);
r = await call('/api/streak/' + K, { method: 'PUT', body: { char: 'eden', name: 'עדן', coins: 70, level: 2, shards: 3, count: 12, best: 12, freezes: 0, lastDay: '2026-11-09', lost: { count: 12, day: '2026-11-09', freezes: 0, restored: true }, appliedSeq: 1 } }); rec = await r.json();
t('after applying, the phone state is stored', rec.count === 12 && rec.lost.restored === true);
r = await call('/api/admin/streak', { method: 'POST', token, body: { key: K, action: 'restore' } }); t('cannot restore twice', r.status >= 400);
r = await call('/api/admin/streak', { method: 'POST', token, body: { key: K, action: 'set', count: 20, freezes: 2 } }); rec = (await r.json()).player; t('admin set', rec.override.seq === 2 && rec.count === 20 && rec.freezes === 2);
console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
