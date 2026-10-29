// usage: node tools/add_bundle.mjs <bundle.json>  - compiles scenes, merges into content/*.json (never overwrites existing ids), validates first
import fs from 'fs';
import { compileBundle } from '../src/shared/scenebuild.js';
import { mergeBundle, validateContent } from '../src/shared/validate.js';
const names = ['characters','npcs','items','quests','dialogues','maps','shop','achievements','config'];
const f = (n) => new URL('../content/' + n + '.json', import.meta.url);
const c = {}; for (const n of names) c[n] = JSON.parse(fs.readFileSync(f(n), 'utf8'));
const b = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
compileBundle(b, c);
const m = mergeBundle(c, b); const v = validateContent(m.content);
console.log('conflicts', m.conflicts, 'errors', v.errors, 'warnings', v.warnings);
if (v.errors.length) process.exit(1);
if (process.argv[3] === '--shards') m.content.config.finalShards = Object.values(m.content.quests).filter((q) => q.reward?.shard).length;
for (const n of names) fs.writeFileSync(f(n), JSON.stringify(m.content[n], null, 1) + '\n');
console.log('added; finalShards', m.content.config.finalShards);
