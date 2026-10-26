#!/usr/bin/env node
// Eval checker for headless Claude Code runs (playbook lesson 9), without jq.
// Usage: node evals/check.mjs <eval.json> <result.json> [phrasing-index]
//   eval.json   = { "skill": "start", "phrasings": ["…", "…", "…"],
//                   "expect": { "contains": ["…"], "not_contains": ["…"], "not_error": true, "max_cost_usd": 2 } }
//   result.json = output of `claude -p "<phrasing>" --output-format json`
// Prints one PASS/FAIL line per check and a JSON summary; exit 0 when every check passes.
import { readFileSync } from 'node:fs';

const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const result = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const text = String(result.result ?? '');
let failed = 0;
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; };
const e = spec.expect ?? {};
if (e.not_error) check('not_error', result.is_error === false);
for (const s of e.contains ?? []) check(`contains "${s}"`, text.includes(s));
for (const s of e.not_contains ?? []) check(`not_contains "${s}"`, !text.includes(s));
if (e.max_cost_usd != null) check(`cost <= ${e.max_cost_usd}`, (result.total_cost_usd ?? Infinity) <= e.max_cost_usd);
console.log(JSON.stringify({ skill: spec.skill, phrasing: process.argv[4] ?? null, cost_usd: result.total_cost_usd ?? null, session_id: result.session_id ?? null, failed }));
process.exit(failed ? 1 : 0);
