#!/usr/bin/env node
// Release contract of the loops repo (ST-012): the version is one number in four places, and a change
// to what consumers receive (template/, skills/, loops-install-files.txt) bumps it.
//   node test/release.mjs              check this repo (exit 1 on a mismatch)
//   node test/release.mjs --fixtures   T-REL-1 / T-REL-2 on throwaway repos
import './git-env.mjs';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const git = (cwd, args) => { const r = spawnSync('git', args, { cwd, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
const rd = (p) => readFileSync(p, 'utf8');

export function releaseCheck(root) {
  const problems = [];
  const notes = [];
  const version = JSON.parse(rd(join(root, '.claude-plugin/plugin.json'))).version;
  const changelog = existsSync(join(root, 'CHANGELOG.md')) ? rd(join(root, 'CHANGELOG.md')).match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1] : null;
  if (changelog !== version) problems.push(`CHANGELOG.md first entry is ${changelog ?? 'missing'}, plugin.json says ${version}`);
  const stamp = existsSync(join(root, 'docs/LOOP.md')) ? rd(join(root, 'docs/LOOP.md')).match(/loops v(\d+\.\d+\.\d+)/)?.[1] : null;
  if (stamp !== version) problems.push(`docs/LOOP.md LOOPS_VERSION is ${stamp ?? 'missing'}, plugin.json says ${version}`);
  const manifest = existsSync(join(root, '.loops/manifest.json')) ? JSON.parse(rd(join(root, '.loops/manifest.json'))).version : null;
  if (manifest !== version) problems.push(`.loops/manifest.json is ${manifest ?? 'missing'}, plugin.json says ${version} — run "node scripts/loops-update.mjs apply --plugin ."`);
  // The bump rule needs something to compare with: the upstream of the current branch, else origin/main.
  const upstream = git(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']) ?? (git(root, ['rev-parse', '--verify', '--quiet', 'origin/main']) ? 'origin/main' : null);
  if (!upstream) notes.push('bump rule skipped: no upstream ref to compare with (nothing pushed yet)');
  else {
    const changed = (git(root, ['diff', '--name-only', `${upstream}...HEAD`, '--', 'template', 'skills', 'loops-install-files.txt']) ?? '').split('\n').filter(Boolean);
    if (changed.length) {
      const was = (() => { try { return JSON.parse(git(root, ['show', `${upstream}:.claude-plugin/plugin.json`]) ?? '{}').version; } catch { return null; } })();
      if (was === version) problems.push(`${changed.length} payload file(s) changed since ${upstream} (${changed.slice(0, 5).join(', ')}${changed.length > 5 ? ', …' : ''}) but plugin.json is still ${version} — bump it and add a CHANGELOG entry`);
      else notes.push(`payload changed since ${upstream}; version ${was ?? '?'} → ${version}`);
    } else notes.push(`no payload change since ${upstream}`);
  }
  return { version, problems, notes };
}

function fixtures() {
  const WORK = mkdtempSync(join(tmpdir(), 'loops-release-'));
  const wr = (p, t) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, t); };
  const g = (cwd, ...args) => { const r = spawnSync('git', args, { cwd, encoding: 'utf8' }); if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stdout}${r.stderr}`); return r.stdout; };
  const seed = (d, v) => {
    wr(join(d, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'loops', version: v }));
    wr(join(d, 'CHANGELOG.md'), `# Changelog\n\n## [${v}] — 2026-01-01\n\n- x\n`);
    wr(join(d, 'docs/LOOP.md'), `> loops v${v}\n`);
    wr(join(d, '.loops/manifest.json'), JSON.stringify({ version: v, files: {}, frozen: [] }));
    wr(join(d, 'template/x.md'), 'payload\n');
  };
  let failed = 0;
  const t = (name, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : `\n     ${detail}`}`); if (!cond) failed++; };

  // T-REL-1: the four places disagree → problems name each; agree → none.
  const a = join(WORK, 'a'); seed(a, '0.2.0');
  let r = releaseCheck(a);
  t('T-REL-1 four places agree: no problem', r.problems.length === 0, r.problems.join('; '));
  wr(join(a, 'CHANGELOG.md'), '# Changelog\n\n## [0.1.0] — 2026-01-01\n'); wr(join(a, 'docs/LOOP.md'), '> loops v0.1.0\n');
  r = releaseCheck(a);
  t('T-REL-1 CHANGELOG and LOOP.md behind plugin.json: two problems', r.problems.length === 2 && /CHANGELOG/.test(r.problems[0]) && /LOOP\.md/.test(r.problems[1]), r.problems.join('; '));

  // T-REL-2: payload changed against upstream without a bump → problem; with a bump → fine; no upstream → skipped.
  const b = join(WORK, 'b'); seed(b, '0.1.0');
  g(b, 'init', '-q', '-b', 'main'); g(b, 'config', 'user.email', 't@x'); g(b, 'config', 'user.name', 't'); g(b, 'add', '-A'); g(b, 'commit', '-q', '-m', 'v0.1.0');
  r = releaseCheck(b);
  t('T-REL-2 no upstream: bump rule skipped and said so', r.problems.length === 0 && r.notes.some((n) => /skipped/.test(n)), `${r.problems.join('; ')} | ${r.notes.join('; ')}`);
  const remote = join(WORK, 'b-remote.git'); g(b, 'clone', '-q', '--bare', b, remote); g(b, 'remote', 'add', 'origin', remote); g(b, 'fetch', '-q', 'origin'); g(b, 'branch', '-q', '-u', 'origin/main');
  wr(join(b, 'template/x.md'), 'payload v2\n'); g(b, 'add', '-A'); g(b, 'commit', '-q', '-m', 'payload change');
  r = releaseCheck(b);
  t('T-REL-2 payload changed, no bump: problem', r.problems.some((p) => /payload file\(s\) changed/.test(p)), r.problems.join('; '));
  seed(b, '0.1.1'); wr(join(b, 'template/x.md'), 'payload v2\n'); g(b, 'add', '-A'); g(b, 'commit', '-q', '-m', 'bump');
  r = releaseCheck(b);
  t('T-REL-2 payload changed, bumped: no problem', r.problems.length === 0, r.problems.join('; '));
  try { rmSync(WORK, { recursive: true, force: true }); } catch { /* windows */ }
  console.log(failed ? `\n${failed} release fixture(s) failed` : '\nall release fixtures passed');
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes('--fixtures')) fixtures();
else {
  const r = releaseCheck(ROOT);
  for (const n of r.notes) console.log(`release: note — ${n}`);
  if (r.problems.length) { console.error(`release: ${r.problems.length} problem(s)`); for (const p of r.problems) console.error(`  ✗ ${p}`); process.exit(1); }
  console.log(`release: OK — version ${r.version} in plugin.json, CHANGELOG.md, docs/LOOP.md, .loops/manifest.json`);
}
