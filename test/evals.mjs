#!/usr/bin/env node
// T-CI-1: evals/check.mjs passes a result whose text contains every expected string and is_error is
// false, and fails otherwise. Run: node test/evals.mjs
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const d = mkdtempSync(join(tmpdir(), 'loops-evals-'));
const ev = join(d, 'e.json'); writeFileSync(ev, JSON.stringify({ skill: 'x', phrasings: ['p'], expect: { contains: ['Recommended next'], not_error: true, max_cost_usd: 3 } }));
const ok = join(d, 'ok.json'); writeFileSync(ok, JSON.stringify({ is_error: false, result: '## Recommended next: ST-1', total_cost_usd: 0.5 }));
const bad = join(d, 'bad.json'); writeFileSync(bad, JSON.stringify({ is_error: true, result: '', total_cost_usd: 9 }));
const run = (r) => spawnSync(process.execPath, [join(ROOT, 'template/evals/check.mjs'), ev, r, '0'], { encoding: 'utf8' });
let failed = 0;
const t = (name, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failed++; };
const a = run(ok); t('T-CI-1 passing result exits 0 with three PASS lines', a.status === 0 && (a.stdout.match(/^PASS/gm) || []).length === 3);
const b = run(bad); t('T-CI-1 failing result exits 1 with three FAIL lines', b.status === 1 && (b.stdout.match(/^FAIL/gm) || []).length === 3);
console.log(failed ? `\n${failed} case(s) failed` : '\nall eval-checker cases passed');
process.exit(failed ? 1 : 0);
