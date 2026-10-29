// usage: node tools/make_pv.mjs <who> <direct 0|1>  -> writes tools/tmp/pv_steps.json
import fs from 'fs';
import { compileBundle } from '../src/shared/scenebuild.js';
import { mergeBundle } from '../src/shared/validate.js';
const rd = (n) => JSON.parse(fs.readFileSync(new URL('../content/' + n + '.json', import.meta.url), 'utf8'));
const c = {}; for (const n of ['characters','npcs','items','quests','dialogues','maps','shop','achievements','config']) c[n] = rd(n);
const b = JSON.parse(fs.readFileSync(new URL('./sample_level.json', import.meta.url), 'utf8'));
b.items = { room_key: { id: 'room_key', name: 'מפתח חדר', type: 'quest', icon: 'key', color: '#ffd23f', desc: 'מפתח' } };
compileBundle(b, c);
const m = mergeBundle(c, b).content;
const pv = { content: m, who: process.argv[2] || 'mordechai', ids: ['q_lobby_meet'], direct: process.argv[3] === '1' };
const js = `localStorage.setItem('bz-preview', ${JSON.stringify(JSON.stringify(pv))}); location.href='/?preview=1&t=1'; 'ok'`;
fs.mkdirSync(new URL('./tmp/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('./tmp/pv_steps.json', import.meta.url), JSON.stringify([{ js }, { wait: 3500, shot: 'hub' }, { js: "JSON.stringify({map:__bz.S.state.map,char:__bz.S.state.activeChar,mission:__bz.Q.currentMission()?.id,caller:__game.scene.getScene('World').callerId})", wait: 300 }]));
