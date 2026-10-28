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
  SAVES: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v) } };
const call = (path, { method = 'GET', body, token, origin = 'https://o.github.io' } = {}) => worker.fetch(new Request('https://api.test' + path, { method, headers: { origin, 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }), env);
let fails = 0; const t = (name, cond, info = '') => { if (!cond) fails++; console.log(cond ? 'PASS' : 'FAIL', name, info); };

let r = await call('/api/login', { method: 'POST', body: { password: 'nope' } }); t('login wrong password -> 401', r.status === 401);
r = await call('/api/login', { method: 'POST', body: { password: 'secret-pw' } }); const { token } = await r.json(); t('login ok -> token', r.status === 200 && token.includes('.'));
r = await call('/api/admin/content'); t('admin route without token -> 401', r.status === 401);
r = await call('/api/admin/content', { token: token + 'x' }); t('tampered token -> 401', r.status === 401);
r = await call('/api/admin/content', { token }); const c = await r.json(); t('read content from repo', r.status === 200 && !!c.files['quests.json']);
r = await call('/api/admin/content', { token, origin: 'https://evil.example' }); t('CORS: foreign origin gets no allow header', !r.headers.get('access-control-allow-origin'));

const goodBundle = { quests: { q_t1: { id: 'q_t1', title: 'מבחן', giver: 'uncle', summary: 's', offer: [{ who: 'uncle', text: '{f:תוכלי|m:תוכל} לעזור?' }], steps: [{ type: 'talk', npc: 'grandma', text: 'לדבר עם סבתא', lines: [{ who: 'grandma', text: 'היי' }] }], reward: { coins: 20, xp: 20, shard: { id: 'shard_t1', title: 'ט', story: 'ס' } } } } };
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
console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
