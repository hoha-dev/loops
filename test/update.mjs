#!/usr/bin/env node
// Fixture tests for template/scripts/loops-update.mjs (ADR-0005). Each case builds a consuming repo from
// template/ and a fake "plugin checkout" whose template was edited to play the upstream, then runs the
// real script. Run from the loops repo root: `node test/update.mjs` (add a case name to run one).
import './git-env.mjs';
import { cpSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORK = mkdtempSync(join(tmpdir(), 'loops-update-'));

const sh = (cwd, args) => { const r = spawnSync(process.execPath, [join(ROOT, 'template/scripts/loops-update.mjs'), ...args], { cwd, encoding: 'utf8' }); return { code: r.status, out: `${r.stdout}${r.stderr}` }; };
const git = (cwd, ...args) => { const r = spawnSync('git', args, { cwd, encoding: 'utf8' }); if (r.status !== 0) throw new Error(`git ${args.join(' ')}:\n${r.stdout}${r.stderr}`); return r.stdout; };
const rd = (p) => readFileSync(p, 'utf8');
const wr = (p, t) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, t); };
const check = (cwd) => { const r = spawnSync(process.execPath, ['scripts/loops-check.mjs'], { cwd, encoding: 'utf8' }); return { code: r.status, out: `${r.stdout}${r.stderr}` }; };

// A plugin checkout: plugin.json + manifest + template/, at a given version.
function plugin(name, version) {
  const d = join(WORK, name);
  mkdirSync(join(d, '.claude-plugin'), { recursive: true });
  writeFileSync(join(d, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'loops', version }));
  cpSync(join(ROOT, 'loops-install-files.txt'), join(d, 'loops-install-files.txt'));
  cpSync(join(ROOT, 'template'), join(d, 'template'), { recursive: true });
  return d;
}
// A consuming repo installed from plugin p: template copied, base recorded, committed.
function repo(name, p, { hook = true } = {}) {
  const d = join(WORK, name);
  cpSync(join(p, 'template'), d, { recursive: true });
  writeFileSync(join(d, 'docs/decisions/ADR-0001-stack.md'), '# ADR-0001\n\n- **Status:** Accepted\n');
  git(d, 'init', '-q', '-b', 'main'); git(d, 'config', 'user.email', 't@x'); git(d, 'config', 'user.name', 't'); git(d, 'config', 'core.autocrlf', 'false');
  const r = sh(d, ['init', '--plugin', p]);
  if (r.code !== 0) throw new Error(`init failed:\n${r.out}`);
  if (hook) { mkdirSync(join(d, '.githooks'), { recursive: true }); writeFileSync(join(d, '.githooks/pre-push'), '#!/bin/sh\nnode scripts/loops-check.mjs\n'); git(d, 'config', 'core.hooksPath', '.githooks'); }
  git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'install');
  return d;
}
const MANAGED = 'docs/templates/runbook.md';
const MIXED = 'docs/LOOP.md';

const cases = [];
const test = (name, fn) => cases.push({ name, fn });
const expect = (cond, msg, out) => { if (!cond) throw new Error(`${msg}${out ? `\n--- output ---\n${String(out).trim()}` : ''}`); };

test('T-UPD-1 init records manifest + base, status says current', () => {
  const p = plugin('p1', '0.1.0');
  const d = repo('r1', p);
  const m = JSON.parse(rd(join(d, '.loops/manifest.json')));
  expect(m.version === '0.1.0' && m.files[MANAGED]?.kind === 'managed' && m.files[MIXED]?.kind === 'mixed', 'expected version and kinds in the manifest', JSON.stringify(m).slice(0, 300));
  expect(/^[0-9a-f]{64}$/.test(m.files[MANAGED].sha256), 'expected a sha256 per file');
  expect(rd(join(d, '.loops/base', MANAGED)) === rd(join(p, 'template', MANAGED)), 'expected the base to equal the template');
  expect(/\.loops\/update\/$/m.test(rd(join(d, '.gitignore'))), 'expected .loops/update/ in .gitignore');
  expect(/^\.worktrees\/$/m.test(rd(join(d, '.gitignore'))), 'expected .worktrees/ in .gitignore (loops-check item 16)');
  const s = sh(d, ['status', '--plugin', p]);
  expect(s.code === 0 && /current/.test(s.out) && /no managed file modified/.test(s.out), 'expected current + no drift', s.out);
});

test('T-UPD-2 upstream change, no local edit: applied, base and version updated', () => {
  const p1 = plugin('p2a', '0.1.0'); const d = repo('r2', p1);
  const p2 = plugin('p2b', '0.2.0'); wr(join(p2, 'template', MANAGED), `${rd(join(p2, 'template', MANAGED))}\nnew upstream line\n`);
  const r = sh(d, ['apply', '--plugin', p2]);
  expect(r.code === 0 && /update\s+docs\/templates\/runbook\.md/.test(r.out), 'expected exit 0 and an update row', r.out);
  expect(/new upstream line/.test(rd(join(d, MANAGED))), 'expected the live file updated');
  expect(JSON.parse(rd(join(d, '.loops/manifest.json'))).version === '0.2.0', 'expected manifest at 0.2.0');
  expect(/new upstream line/.test(rd(join(d, '.loops/base', MANAGED))), 'expected the base updated');
});

test('T-UPD-3 local edit in another region survives a clean merge', () => {
  const p1 = plugin('p3a', '0.1.0'); const d = repo('r3', p1);
  wr(join(d, MANAGED), `local first line\n${rd(join(d, MANAGED))}`); git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'local');
  const p2 = plugin('p3b', '0.2.0'); wr(join(p2, 'template', MANAGED), `${rd(join(p2, 'template', MANAGED))}\nupstream last line\n`);
  const r = sh(d, ['apply', '--plugin', p2]);
  const t = rd(join(d, MANAGED));
  expect(r.code === 0 && t.startsWith('local first line') && /upstream last line\n$/.test(t), 'expected both edits in the result', r.out);
});

test('T-UPD-4 overlapping edits: staged, live file untouched; --continue refuses markers then applies; --abort', () => {
  const p1 = plugin('p4a', '0.1.0'); const d = repo('r4', p1);
  const lines = rd(join(d, MANAGED)).split('\n');
  lines[0] = '# local title'; wr(join(d, MANAGED), lines.join('\n')); git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'local');
  const before = rd(join(d, MANAGED));
  const p2 = plugin('p4b', '0.2.0'); const ul = rd(join(p2, 'template', MANAGED)).split('\n'); ul[0] = '# upstream title'; wr(join(p2, 'template', MANAGED), ul.join('\n'));
  const r = sh(d, ['apply', '--plugin', p2]);
  expect(r.code === 2 && /conflict\s+docs\/templates\/runbook\.md/.test(r.out) && /nothing written/.test(r.out), 'expected exit 2 with the conflict named', r.out);
  expect(rd(join(d, MANAGED)) === before, 'expected the live file byte-identical');
  const resolved = join(d, '.loops/update/resolved', MANAGED);
  for (const sub of ['base', 'local', 'incoming', 'resolved']) expect(existsSync(join(d, '.loops/update', sub, MANAGED)), `expected ${sub}/ staged`);
  expect(/<{7} local/.test(rd(resolved)) && /\|{7} base/.test(rd(resolved)), 'expected diff3 markers in resolved/', rd(resolved).slice(0, 300));
  let c = sh(d, ['--continue']);
  expect(c.code === 1 && /still has conflict markers/.test(c.out), 'expected --continue to refuse markers', c.out);
  wr(resolved, rd(resolved).replace(/<{7} local\n[\s\S]*?>{7} upstream\n/, '# merged title\n'));
  c = sh(d, ['--continue']);
  expect(c.code === 0 && /^# merged title/.test(rd(join(d, MANAGED))) && !existsSync(join(d, '.loops/update')), 'expected --continue to apply and clear the staging dir', c.out);
  expect(JSON.parse(rd(join(d, '.loops/manifest.json'))).version === '0.2.0', 'expected manifest at 0.2.0 after continue');
  // --abort
  const p3 = plugin('p4c', '0.3.0'); const u3 = rd(join(p3, 'template', MANAGED)).split('\n'); u3[0] = '# third title'; wr(join(p3, 'template', MANAGED), u3.join('\n'));
  git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'updated');
  expect(sh(d, ['apply', '--plugin', p3]).code === 2, 'expected a second conflict');
  const a = sh(d, ['--abort']);
  expect(a.code === 0 && !existsSync(join(d, '.loops/update')) && /^# merged title/.test(rd(join(d, MANAGED))), 'expected --abort to drop the staging dir and leave the tree', a.out);
});

test('T-UPD-5 mixed file: only the block is merged, bytes outside the markers identical; seeded untouched', () => {
  const p1 = plugin('p5a', '0.1.0'); const d = repo('r5', p1);
  const loop = rd(join(d, MIXED)).replace('{{PROJECT_NAME}}', 'My Repo').replace('(localized from the SAD at init', '(this repo wrote this');
  wr(join(d, MIXED), loop); wr(join(d, 'docs/README.md'), 'seeded content of the repo\n'); git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'fill');
  const p2 = plugin('p5b', '0.2.0');
  wr(join(p2, 'template', MIXED), rd(join(p2, 'template', MIXED)).replace('## Why this layer exists', '## Why this layer exists (v0.2)'));
  wr(join(p2, 'template', 'docs/README.md'), 'NEW SEEDED TEMPLATE\n');
  const r = sh(d, ['apply', '--plugin', p2]);
  expect(r.code === 0, 'expected a clean block merge', r.out);
  const after = rd(join(d, MIXED));
  expect(/## Why this layer exists \(v0\.2\)/.test(after), 'expected the block updated');
  const outside = (t) => t.replace(/<!-- LOOPS:BEGIN[\s\S]*?LOOPS:END [\w-]+ -->/g, '');
  expect(outside(after) === outside(loop), 'expected bytes outside the markers unchanged');
  expect(/this repo wrote this/.test(after) && /My Repo/.test(after), 'expected the repo-owned text kept');
  expect(rd(join(d, 'docs/README.md')) === 'seeded content of the repo\n', 'expected the seeded file untouched');
});

test('T-UPD-7 apply rewrites the LOOPS_VERSION stamp; loops-check sees no version mismatch', () => {
  const p1 = plugin('p7a', '0.1.0'); const d = repo('r7', p1);
  wr(join(d, 'docs/LOOP.md'), rd(join(d, 'docs/LOOP.md')).replace('{{LOOPS_VERSION}}', '0.1.0'));
  git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'stamp');
  const p2 = plugin('p7b', '0.2.0');
  const r = sh(d, ['apply', '--plugin', p2]);
  expect(r.code === 0 && /stamped\s+docs\/LOOP\.md\s+— loops v0\.2\.0/.test(r.out), 'expected a stamped row', r.out);
  expect(/\(loops v0\.2\.0\)/.test(rd(join(d, 'docs/LOOP.md'))), 'expected the stamp at 0.2.0');
  const c = check(d);
  expect(!/LOOPS_VERSION .* but \.loops\/manifest\.json says/.test(c.out), 'expected no version mismatch note', c.out);
});

test('T-UPD-8 no managed script or hook carries a literal {{SLOT}} (the merge would stage it as a conflict)', () => {
  const dirs = ['template/scripts', 'template/.claude/hooks', 'template/evals'];
  const hits = dirs.flatMap((d) => readdirSync(join(ROOT, d)).filter((f) => /\.(mjs|js|sh)$/.test(f)).map((f) => join(d, f)))
    .filter((p) => /\{\{[A-Z_0-9]+\}\}/.test(rd(join(ROOT, p))));
  expect(hits.length === 0, `expected no literal slot in ${hits.join(', ')}`);
});

test('T-UPD-6 frozen path skipped; loops-check notes drift and a version mismatch', () => {
  const p1 = plugin('p6a', '0.1.0'); const d = repo('r6', p1);
  const mp = join(d, '.loops/manifest.json'); const m = JSON.parse(rd(mp)); m.frozen = ['scripts/loops-gen.mjs']; wr(mp, JSON.stringify(m, null, 2));
  wr(join(d, 'scripts/loops-gen.mjs'), `${rd(join(d, 'scripts/loops-gen.mjs'))}\n// local fork\n`);
  wr(join(d, MANAGED), `${rd(join(d, MANAGED))}\nlocal drift\n`);
  git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'freeze');
  const s = sh(d, ['status']);
  expect(s.code === 0 && /frozen.*scripts\/loops-gen\.mjs/.test(s.out) && /modified locally since install: docs\/templates\/runbook\.md$/m.test(s.out), 'expected frozen listed and only runbook as drift', s.out);
  const p2 = plugin('p6b', '0.2.0'); wr(join(p2, 'template', 'scripts/loops-gen.mjs'), '// upstream rewrite\n');
  const r = sh(d, ['apply', '--plugin', p2]);
  expect(r.code === 0 && /frozen\s+scripts\/loops-gen\.mjs/.test(r.out) && /local fork/.test(rd(join(d, 'scripts/loops-gen.mjs'))), 'expected the frozen file skipped', r.out);
  // drift note from loops-check: runbook now differs from its (new) base again
  wr(join(d, MANAGED), `${rd(join(d, MANAGED))}\nmore drift\n`);
  wr(join(d, 'docs/LOOP.md'), rd(join(d, 'docs/LOOP.md')).replace('{{LOOPS_VERSION}}', '0.1.0'));
  const c = check(d);
  expect(/managed file\(s\) differ from the installed base: docs\/templates\/runbook\.md/.test(c.out), 'expected a drift note from loops-check', c.out);
  expect(/LOOPS_VERSION 0\.1\.0 in docs\/LOOP\.md but \.loops\/manifest\.json says 0\.2\.0/.test(c.out), 'expected a version mismatch note', c.out);
});

// The body of one LOOPS block of a mixed file.
const blockBody = (t, name) => t.match(new RegExp(`<!-- LOOPS:BEGIN ${name}[^>]*-->\\n([\\s\\S]*?)<!-- LOOPS:END ${name} -->`))[1];
const firstLongLine = (body) => body.split('\n').find((l) => l.trim().length > 20);

test('T-UPD-9 mixed file, two blocks changed upstream, one conflicting: both staged or carried; after --continue both upstream changes are in', () => {
  const p1 = plugin('p9a', '0.1.0'); const d = repo('r9', p1);
  const t = rd(join(d, MIXED));
  const coreLine = firstLongLine(blockBody(t, 'core')); const ritLine = firstLongLine(blockBody(t, 'rituals'));
  wr(join(d, MIXED), t.replace(coreLine, `${coreLine} LOCAL-CORE`)); git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'local');
  const p2 = plugin('p9b', '0.2.0');
  wr(join(p2, 'template', MIXED), rd(join(p2, 'template', MIXED)).replace(coreLine, `${coreLine} UPSTREAM-CORE`).replace(ritLine, `${ritLine} UPSTREAM-RITUALS`));
  const r = sh(d, ['apply', '--plugin', p2]);
  expect(r.code === 2 && /block "core"/.test(r.out), 'expected the core block staged as a conflict', r.out);
  const res = join(d, '.loops/update/resolved', `${MIXED}#core`);
  wr(res, rd(res).replace(/^<{7}.*\n[\s\S]*?^={7}.*\n/m, '').replace(/^>{7}.*\n/m, ''));
  const c = sh(d, ['--continue']);
  const after = rd(join(d, MIXED));
  expect(c.code === 0 && /UPSTREAM-CORE/.test(after), 'expected the resolved core block applied', c.out);
  expect(/UPSTREAM-RITUALS/.test(after), 'expected the clean rituals change applied too', after.slice(0, 200));
  git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'updated');
  const again = sh(d, ['apply', '--plugin', p2]);
  expect(again.code === 0 && !/update\s+docs\/LOOP\.md/.test(again.out), 'expected nothing left to do', again.out);
});

test('T-UPD-10 a managed file with no stored base that differs from upstream is a conflict, never unchanged', () => {
  const p1 = plugin('p10a', '0.1.0'); const d = repo('r10', p1);
  rmSync(join(d, '.loops/base', MANAGED)); git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'lose base');
  const p2 = plugin('p10b', '0.2.0'); wr(join(p2, 'template', MANAGED), `${rd(join(p2, 'template', MANAGED))}\nUPSTREAM-LINE\n`);
  const r = sh(d, ['apply', '--plugin', p2]);
  expect(r.code === 2 && /conflict\s+docs\/templates\/runbook\.md\s+— no stored base/.test(r.out), 'expected the base-less file staged as a conflict', r.out);
  expect(!/UPSTREAM-LINE/.test(rd(join(d, MANAGED))), 'expected the live file untouched');
});

test('T-UPD-11 init over existing files records a base only for files equal to the template; apply then stages every other differing file', () => {
  const p1 = plugin('p11a', '0.1.0');
  const d = join(WORK, 'r11'); cpSync(join(p1, 'template'), d, { recursive: true });
  const G = 'docs/templates/review.md';
  wr(join(d, G), `${rd(join(d, G))}\nREPO-EDIT\n`);
  git(d, 'init', '-q', '-b', 'main'); git(d, 'config', 'user.email', 't@x'); git(d, 'config', 'user.name', 't'); git(d, 'config', 'core.autocrlf', 'false');
  git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'installed before v0.2');
  const p2 = plugin('p11b', '0.2.0');
  wr(join(p2, 'template', MANAGED), `${rd(join(p2, 'template', MANAGED))}\nUPSTREAM-RUNBOOK\n`);
  wr(join(p2, 'template', G), `${rd(join(p2, 'template', G))}\nUPSTREAM-REVIEW\n`);
  expect(sh(d, ['init', '--plugin', p2]).code === 0, 'expected init to succeed');
  expect(!existsSync(join(d, '.loops/base', MANAGED)) && !existsSync(join(d, '.loops/base', G)), 'expected no base for files that differ from the template');
  expect(existsSync(join(d, '.loops/base/docs/templates/spec.md')), 'expected a base for a file equal to the template');
  const s0 = sh(d, ['status', '--plugin', p2]);
  expect(/2 file\(s\) without a base — run apply/.test(s0.out) && !/→ current/.test(s0.out), 'expected status not to say current before the base-less files are merged', s0.out);
  git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'base');
  const r = sh(d, ['apply', '--plugin', p2]);
  expect(r.code === 2 && /conflict\s+docs\/templates\/runbook\.md/.test(r.out) && /conflict\s+docs\/templates\/review\.md/.test(r.out), 'expected both differing files staged', r.out);
  expect(/pending update staged/.test(sh(d, ['status', '--plugin', p2]).out), 'expected status to name the pending staging');
});

test('T-UPD-12 every file listed as mixed has at least one LOOPS:BEGIN block in template/', () => {
  const mixed = rd(join(ROOT, 'loops-install-files.txt')).split('\n').map((l) => l.match(/^mixed\s+(\S+)/)?.[1]).filter(Boolean);
  const bare = mixed.filter((p) => !/<!-- LOOPS:BEGIN [\w-]+/.test(rd(join(ROOT, 'template', p))));
  expect(mixed.length > 0 && bare.length === 0, `expected a LOOPS block in every mixed file; none in: ${bare.join(', ')}`);
});

test('T-UPD-13 apply with no managed file to touch succeeds while an unrelated file is dirty', () => {
  const p1 = plugin('p13a', '0.1.0'); const d = repo('r13', p1);
  wr(join(d, 'unrelated.txt'), 'work in progress\n');
  const p2 = plugin('p13b', '0.2.0');
  const r = sh(d, ['apply', '--plugin', p2]);
  expect(r.code === 0 && !/uncommitted changes/.test(r.out), 'expected apply to ignore a dirty file it does not touch', r.out);
});

const only = process.argv[2];
let failed = 0;
for (const c of cases) {
  if (only && !c.name.includes(only)) continue;
  try { c.fn(); console.log(`ok   ${c.name}`); } catch (e) { failed++; console.log(`FAIL ${c.name}\n     ${String(e.message).split('\n').join('\n     ')}`); }
}
try { rmSync(WORK, { recursive: true, force: true }); } catch { /* windows handles */ }
console.log(failed ? `\n${failed} case(s) failed` : '\nall update cases passed');
process.exit(failed ? 1 : 0);
