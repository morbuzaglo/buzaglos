// Headless-Chrome driver for testing: node tools/shot.mjs <url> <outPrefix> [--w 390 --h 844] [--steps steps.json]
// steps.json: [{ "js": "...", "wait": 500, "shot": "name" }, ...]  (js runs in the page; result printed)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const url = args[0], prefix = args[1];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const W = +opt('w', 390), H = +opt('h', 844);
const steps = JSON.parse(fs.readFileSync(opt('steps', 'steps.json'), 'utf8'));
const port = 9300 + Math.floor(Math.random() * 500);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'chr-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs;
for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.find((t) => t.type === 'page')) break; } catch { /* retry */ } await sleep(250); }
const tab = tabs.find((t) => t.type === 'page');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const logs = [];
ws.onmessage = (m) => { const o = JSON.parse(m.data); if (o.id && pending.has(o.id)) { pending.get(o.id)(o); pending.delete(o.id); } else if (o.method === 'Runtime.consoleAPICalled') logs.push(o.params.type + ': ' + o.params.args.map((a) => a.value ?? a.description).join(' ')); else if (o.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION: ' + (o.params.exceptionDetails.exception?.description || o.params.exceptionDetails.text)); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Page.navigate', { url });
await sleep(+opt('load', 2500));
for (const s of steps) {
  if (s.file) s.js = fs.readFileSync(s.file, 'utf8');
  if (s.js) { const r = await send('Runtime.evaluate', { expression: s.js, awaitPromise: true, returnByValue: true }); if (r.result?.result?.value !== undefined) console.log('js ->', JSON.stringify(r.result.result.value)); if (r.result?.exceptionDetails) console.log('js error:', r.result.exceptionDetails.exception?.description); }
  if (s.wait) await sleep(s.wait);
  if (s.shot) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${prefix}_${s.shot}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', s.shot); }
}
console.log(logs.join('\n'));
ws.close(); chrome.kill();
