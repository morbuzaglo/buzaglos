// BUZAGLOS backend (Cloudflare Worker). Holds every secret; the frontend never sees them.
//
// Secrets (wrangler secret put ...):  ADMIN_PASSWORD, SESSION_SECRET, ANTHROPIC_API_KEY, GITHUB_TOKEN
// Vars (wrangler.toml):               GITHUB_REPO ("owner/repo"), GITHUB_BRANCH, ALLOWED_ORIGIN, ANTHROPIC_MODEL
// KV namespace:                       SAVES  (cloud saves + login rate limiting)
//
// Routes
//   POST /api/login            { password }                 -> { token }            (rate limited)
//   GET  /api/admin/content    (admin)                      -> { files: { "characters.json": "..." } } read from the repo
//   POST /api/admin/generate   (admin) { story, context }   -> AI draft bundle (validated)
//   POST /api/admin/vision     (admin) { image }            -> { look } from a photo (photo is not stored)
//   POST /api/admin/publish    (admin) { files, message }   -> commits content/*.json to GitHub (triggers the Pages deploy)
//   GET/PUT /api/save/:code    family save code             -> cloud save of the game progress
import { validateContent, mergeBundle } from '../../src/shared/validate.js';
import { compileBundle } from '../../src/shared/scenebuild.js';
import { STORY_SYSTEM_PROMPT, VISION_PROMPT } from './prompts.js';

const enc = new TextEncoder();
const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

function cors(env, req) {
  const origin = req.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || (env.ALLOW_LOCALHOST === '1' && /^http:\/\/localhost:\d+$/.test(origin));
  return ok ? { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS', vary: 'origin' } : {};
}

// ---------------------------------------------------------------- session tokens (HMAC-SHA256)
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
async function makeToken(env) { const p = b64u(enc.encode(JSON.stringify({ exp: Date.now() + 12 * 3600e3 }))); return `${p}.${await hmac(env.SESSION_SECRET, p)}`; }
async function verifyToken(env, token) {
  const [p, sig] = String(token || '').split('.'); if (!p || !sig) return false;
  if (!timingSafeEqual(sig, await hmac(env.SESSION_SECRET, p))) return false;
  try { return JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))).exp > Date.now(); } catch { return false; }
}
function timingSafeEqual(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

async function rateLimit(env, req, key, max, windowSec) {
  if (!env.SAVES) return true;
  const ip = req.headers.get('cf-connecting-ip') || 'x';
  const k = `rl:${key}:${ip}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const n = parseInt((await env.SAVES.get(k)) || '0', 10);
  if (n >= max) return false;
  await env.SAVES.put(k, String(n + 1), { expirationTtl: windowSec * 2 });
  return true;
}

// ---------------------------------------------------------------- GitHub
const gh = (env, path, init = {}) => fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, { ...init, headers: { ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}), accept: 'application/vnd.github+json', 'user-agent': 'buzaglos-worker', 'x-github-api-version': '2022-11-28', ...(init.headers || {}) } });
const b64 = (s) => btoa(String.fromCharCode(...enc.encode(s)));
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), (c) => c.charCodeAt(0)));

async function readContent(env) {
  if (!env.GITHUB_TOKEN) {   // public repo: raw files (no API rate limit)
    const files = {};
    for (const name of ALLOWED_FILES) {
      const r = await fetch(`https://raw.githubusercontent.com/${env.GITHUB_REPO}/${env.GITHUB_BRANCH || 'main'}/content/${name}`);
      if (!r.ok) throw new Error('לא ניתן לקרוא את התוכן מ-GitHub (' + name + ')');
      files[name] = await r.text();
    }
    return files;
  }
  const res = await gh(env, `/contents/content?ref=${env.GITHUB_BRANCH || 'main'}`);
  const list = await res.json();
  if (!Array.isArray(list)) throw new Error('לא ניתן לקרוא את התוכן מ-GitHub');
  const files = {};
  for (const f of list.filter((x) => x.name.endsWith('.json'))) {
    const r = await (await gh(env, `/contents/${f.path}?ref=${env.GITHUB_BRANCH || 'main'}`)).json();
    files[f.name] = unb64(r.content);
  }
  return files;
}
const ALLOWED_FILES = new Set(['characters.json', 'npcs.json', 'items.json', 'quests.json', 'dialogues.json', 'maps.json', 'shop.json', 'achievements.json', 'config.json']);
async function publish(env, files, message) {
  if (!env.GITHUB_TOKEN) throw new Error("פרסום אוטומטי עדיין לא מוגדר (חסר טוקן GitHub). אפשר להוריד את הקבצים.");
  const content = {};
  for (const [name, text] of Object.entries(files)) {
    if (!ALLOWED_FILES.has(name)) throw new Error(`file not allowed: ${name}`);
    content[name.replace('.json', '')] = JSON.parse(text);
  }
  // validate the full resulting content (merge with what is in the repo for files not sent)
  const current = await readContent(env); const full = {};
  for (const [name, text] of Object.entries(current)) full[name.replace('.json', '')] = JSON.parse(text);
  Object.assign(full, content);
  const v = validateContent(full);
  if (v.errors.length) { const e = new Error('validation failed'); e.details = v.errors; throw e; }
  const done = [];
  for (const [name, text] of Object.entries(files)) {
    const path = `content/${name}`;
    const cur = await gh(env, `/contents/${path}?ref=${env.GITHUB_BRANCH || 'main'}`);
    const curJson = cur.ok ? await cur.json() : null;
    const sha = curJson?.sha;
    const pretty = JSON.stringify(JSON.parse(text), null, 1) + '\n';
    if (curJson && unb64(curJson.content) === pretty) continue;     // unchanged
    const r = await gh(env, `/contents/${path}`, { method: 'PUT', body: JSON.stringify({ message: message || `Admin Studio: update ${name}`, content: b64(pretty), sha, branch: env.GITHUB_BRANCH || 'main' }) });
    if (!r.ok) throw new Error(`GitHub error ${r.status}: ${await r.text()}`);
    done.push(name);
  }
  return done;
}

// ---------------------------------------------------------------- Anthropic
async function claude(env, body) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 10000, ...body }) });
  if (!r.ok) throw new Error(`Anthropic error ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json();
  return data.content.map((c) => c.text || '').join('');
}
function extractJson(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const s = m[1]; const a = s.indexOf('{'), b = s.lastIndexOf('}');
  return JSON.parse(s.slice(a, b + 1));
}

const missingItems = (errors) => [...new Set(errors.map((e) => /פריט[^()]*לא קיים \(([A-Za-z0-9_]+)\)/.exec(e)?.[1]).filter(Boolean))];
const prettyName = (id) => id.replace(/^item_/, '').replace(/_/g, ' ');

async function generateStory(env, { story, context, bundle: prev, instruction }) {
  if (!story || story.length > 6000) throw new Error('story missing or too long');
  const files = await readContent(env); const full = {};
  for (const [name, t] of Object.entries(files)) full[name.replace('.json', '')] = JSON.parse(t);
  const user = `הקשר קיים במשחק (אל תמציא דברים מחוץ לו):\n${JSON.stringify(context || {}, null, 1)}\n\nהסיפור שהמשפחה סיפרה (כתבו ממנו משימה/ות):\n${story}`;
  const messages = [{ role: 'user', content: user }];
  if (prev && instruction) { if (String(instruction).length > 2000) throw new Error('instruction too long'); const slim = { ...prev }; delete slim.maps;
    messages.push({ role: 'assistant', content: JSON.stringify(slim) }, { role: 'user', content: `בקשת שינוי מהמשפחה: ${instruction}

החזירו את ה-JSON המלא והמעודכן בלבד (אותו מבנה), ושמרו על כל מה שלא ביקשו לשנות.` }); }
  const text = await claude(env, { system: STORY_SYSTEM_PROMPT, messages });
  const build = (b) => { delete b.maps; compileBundle(b, full); return b; };
  let bundle = build(extractJson(text)), merged, v, fixes = 0;
  // Self-repair: validate, and send any errors back to Claude (missing items get created) until the bundle is ready to approve.
  for (let round = 0; ; round++) {
    merged = mergeBundle(full, bundle); v = validateContent(merged.content);
    if (!v.errors.length || round >= 3) break;
    fixes++;
    const miss = missingItems(v.errors);
    { const slim = { ...bundle }; delete slim.maps; messages.push({ role: 'assistant', content: JSON.stringify(slim) }); }
    messages.push({ role: 'user', content: `הבדיקה האוטומטית מצאה שגיאות:\n- ${v.errors.join('\n- ')}\n\n${miss.length ? `פריטים חסרים: ${miss.join(', ')}. הגדירו אותם במפתח "items" (שם בעברית, type, icon, color, desc), או השתמשו בפריטים קיימים מההקשר.\n` : ''}תקנו והחזירו את ה-JSON המלא והמתוקן בלבד (אותו מבנה כמו קודם), בלי הסברים.` });
    try { bundle = build(extractJson(await claude(env, { system: STORY_SYSTEM_PROMPT, messages }))); } catch { break; }
  }
  // Fallback: any item that still does not exist is created automatically.
  const miss = missingItems(v.errors).filter((id) => !(full.items || {})[id]);
  if (miss.length) {
    bundle.items ||= {};
    for (const id of miss) if (!bundle.items[id]) bundle.items[id] = { id, name: prettyName(id), type: 'quest', icon: 'star', color: '#ffd23f', desc: 'פריט מהסיפור' };
    merged = mergeBundle(full, bundle); v = validateContent(merged.content);
    bundle.notes = [].concat(bundle.notes || [], `נוצרו אוטומטית פריטים: ${miss.join(', ')} (אפשר לערוך שם ואייקון בטיוטה)`);
  }
  delete bundle.maps;   // compiled from `scenes` again by the Studio, deterministic
  return { bundle, conflicts: merged.conflicts, errors: v.errors, warnings: v.warnings, autoFixed: fixes };
}

async function visionLook(env, { image }) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image || '');
  if (!m || m[2].length > 6e6) throw new Error('image must be a jpeg/png/webp data URL under ~4MB');
  const text = await claude(env, { max_tokens: 800, system: VISION_PROMPT, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }, { type: 'text', text: 'החזירו JSON בלבד.' }] }] });
  return extractJson(text);
}

// ---------------------------------------------------------------- router
export default {
  async fetch(req, env) {
    const url = new URL(req.url); const h = cors(env, req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    try {
      const path = url.pathname;
      if (path === '/api/login' && req.method === 'POST') {
        if (!(await rateLimit(env, req, 'login', 8, 60))) return json({ error: 'יותר מדי ניסיונות. נסו שוב בעוד דקה.' }, 429, h);
        const { password } = await req.json();
        if (!env.ADMIN_PASSWORD || !timingSafeEqual(String(password || ''), env.ADMIN_PASSWORD)) return json({ error: 'סיסמה שגויה' }, 401, h);
        return json({ token: await makeToken(env) }, 200, h);
      }
      if (path.startsWith('/api/admin/')) {
        const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
        if (!(await verifyToken(env, token))) return json({ error: 'לא מורשה' }, 401, h);
        if (path === '/api/admin/content' && req.method === 'GET') return json({ files: await readContent(env) }, 200, h);
        if (path === '/api/admin/generate' && req.method === 'POST') { if (!(await rateLimit(env, req, 'gen', 20, 3600))) return json({ error: 'הגעתם למגבלת הבקשות לשעה' }, 429, h); return json(await generateStory(env, await req.json()), 200, h); }
        if (path === '/api/admin/vision' && req.method === 'POST') { if (!(await rateLimit(env, req, 'vis', 30, 3600))) return json({ error: 'הגעתם למגבלת הבקשות לשעה' }, 429, h); return json(await visionLook(env, await req.json()), 200, h); }
        if (path === '/api/admin/publish' && req.method === 'POST') { const { files, message } = await req.json(); return json({ published: await publish(env, files, message) }, 200, h); }
      }
      const sm = /^\/api\/save\/([A-Za-z0-9_-]{8,40})$/.exec(path);
      if (sm && env.SAVES) {
        if (!(await rateLimit(env, req, 'save', 120, 3600))) return json({ error: 'rate limit' }, 429, h);
        if (req.method === 'GET') { const v = await env.SAVES.get('save:' + sm[1]); return v ? new Response(v, { headers: { 'content-type': 'application/json', ...h } }) : json({ error: 'not found' }, 404, h); }
        if (req.method === 'PUT') { const body = await req.text(); if (body.length > 120000) return json({ error: 'too large' }, 413, h); JSON.parse(body); await env.SAVES.put('save:' + sm[1], body); return json({ ok: true }, 200, h); }
      }
      if (path === '/api/health') return json({ ok: true }, 200, h);
      return json({ error: 'not found' }, 404, h);
    } catch (e) {
      return json({ error: e.message || String(e), details: e.details }, e.details ? 422 : 500, h);
    }
  },
};
