// node tools/validate_content.mjs  -> validates /content with the same rules the Admin Studio and Worker use
import fs from 'node:fs';
import { validateContent } from '../src/shared/validate.js';
const dir = new URL('../content/', import.meta.url);
const c = {};
for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) c[f.replace('.json', '')] = JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8'));
const r = validateContent(c);
console.log('errors:', r.errors.length, 'warnings:', r.warnings.length);
r.errors.forEach((e) => console.log('E', e)); r.warnings.forEach((e) => console.log('W', e));
process.exit(r.errors.length ? 1 : 0);
