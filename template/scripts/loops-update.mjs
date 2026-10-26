#!/usr/bin/env node
// loops-update: bring the harness files of a consuming repo to the plugin's current template by a
// three-way merge over the base recorded at install time (ADR-0005). Plain node + git, no jq.
//
//   node scripts/loops-update.mjs init     --plugin <dir>   record .loops/manifest.json + .loops/base/ (run by /loops:init)
//   node scripts/loops-update.mjs status  [--plugin <dir>]  installed version, drift of managed files, pending staging
//   node scripts/loops-update.mjs apply    --plugin <dir>   merge every managed file / mixed block; conflicts are staged, exit 2
//   node scripts/loops-update.mjs --continue                apply the resolved staging directory
//   node scripts/loops-update.mjs --abort                   discard the staging directory
//
// --plugin defaults to $CLAUDE_PLUGIN_ROOT. The plugin dir holds .claude-plugin/plugin.json,
// loops-install-files.txt and template/. Exit codes: 0 done, 1 refused or error, 2 conflicts staged.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync, mkdtempSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const LOOPS_DIR = '.loops';
export const MANIFEST = `${LOOPS_DIR}/manifest.json`;
export const BASE_DIR = `${LOOPS_DIR}/base`;
export const STAGE_DIR = `${LOOPS_DIR}/update`;
const STAGE_SUBDIRS = ['base', 'local', 'incoming', 'resolved', 'merged'];

export const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const read = (p) => readFileSync(p, 'utf8');
const writeFile = (p, text) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
const git = (cwd, args, input) => spawnSync('git', args, { cwd, encoding: 'utf8', input });

// --- plugin side ----------------------------------------------------------------------------------
export function readPlugin(dir) {
  if (!dir) throw new Error('no plugin directory: pass --plugin <dir> or set CLAUDE_PLUGIN_ROOT');
  const root = resolve(dir);
  const pj = join(root, '.claude-plugin', 'plugin.json');
  const manifest = join(root, 'loops-install-files.txt');
  if (!existsSync(pj) || !existsSync(manifest) || !existsSync(join(root, 'template')))
    throw new Error(`${root} is not a loops plugin checkout (needs .claude-plugin/plugin.json, loops-install-files.txt, template/)`);
  const version = JSON.parse(read(pj)).version;
  const files = [];
  for (const line of read(manifest).split('\n')) {
    const m = line.match(/^(managed|mixed|seeded)\s+(\S+)/);
    if (m) files.push({ kind: m[1], path: m[2] });
  }
  return { root, version, files, template: join(root, 'template') };
}

// --- manifest side -------------------------------------------------------------------------------
export function readManifest(root = '.') {
  const p = join(root, MANIFEST);
  if (!existsSync(p)) return null;
  const m = JSON.parse(read(p));
  m.files = m.files ?? {};
  m.frozen = m.frozen ?? [];
  return m;
}
const writeManifest = (root, m) => writeFile(join(root, MANIFEST), `${JSON.stringify(m, null, 2)}\n`);

// --- marker blocks of a mixed file -----------------------------------------------------------------
const BLOCK_RE = /<!-- LOOPS:BEGIN ([\w-]+)[^>]*-->\n([\s\S]*?)<!-- LOOPS:END \1 -->/g;
export function blocksOf(text) {
  const out = new Map();
  for (const m of text.matchAll(BLOCK_RE)) out.set(m[1], { start: m.index, end: m.index + m[0].length, body: m[2], whole: m[0] });
  return out;
}
export function replaceBlockBody(text, name, body) {
  const b = blocksOf(text).get(name);
  if (!b) return null;
  const head = b.whole.slice(0, b.whole.indexOf('\n') + 1);
  return `${text.slice(0, b.start)}${head}${body}<!-- LOOPS:END ${name} -->${text.slice(b.end)}`;
}

// --- the merge -------------------------------------------------------------------------------------
// git merge-file -p --diff3 prints the merged text; its exit code is the number of conflicts.
export function merge3(local, base, upstream) {
  if (local === upstream) return { text: local, conflicts: 0 };
  if (local === base) return { text: upstream, conflicts: 0 };
  if (base === upstream) return { text: local, conflicts: 0 };
  const d = mkdtempSync(join(tmpdir(), 'loops-merge-'));
  const f = (n, t) => { const p = join(d, n); writeFileSync(p, t); return p; };
  const r = git(d, ['merge-file', '-p', '--diff3', '-L', 'local', '-L', 'base', '-L', 'upstream', f('local', local), f('base', base), f('upstream', upstream)]);
  rmSync(d, { recursive: true, force: true });
  if (r.error || r.status === null || r.status < 0 || r.status > 127) throw new Error(`git merge-file failed: ${r.stderr || r.error}`);
  return { text: r.stdout, conflicts: r.status };
}

const hasMarkers = (t) => /^(<{7}|={7}|>{7}|\|{7}) ?/m.test(t);
const newSlots = (merged, local) => /\{\{[A-Z_0-9]+\}\}/.test(merged) && !/\{\{[A-Z_0-9]+\}\}/.test(local);
const whyConflict = (r) => (r.conflicts ? `${r.conflicts} conflicting region(s)` : `upstream adds a slot to fill: ${[...new Set(r.text.match(/\{\{[A-Z_0-9]+\}\}/g))].join(', ')}`);

const NO_BASE = 'no stored base: the repo\'s whole text is shown against upstream';

// One file's plan, as a list of items { path, kind, action: unchanged|update|create|conflict|missing-block,
// block?, text, reason }. A mixed file yields one conflict item per conflicting block, plus one update item
// carrying its clean block merges, so no upstream change is dropped because another block conflicted.
function planFile(root, plugin, entry) {
  const { kind, path } = entry;
  const upstreamPath = join(plugin.template, path);
  const localPath = join(root, path);
  const basePath = join(root, BASE_DIR, path);
  if (!existsSync(upstreamPath)) return [{ path, kind, action: 'unchanged', reason: 'not in the plugin template' }];
  const upstream = read(upstreamPath);
  if (!existsSync(localPath)) return [{ path, kind, action: 'create', text: upstream, reason: 'new in this version' }];
  const local = read(localPath);
  // Without a base nothing tells a local edit from an old upstream text, so an empty base makes every
  // difference from upstream a conflict instead of letting the merge keep the local side unseen.
  const base = existsSync(basePath) ? read(basePath) : null;
  if (kind === 'managed') {
    const r = merge3(local, base ?? '', upstream);
    if (r.conflicts || newSlots(r.text, local))
      return [{ path, kind, action: 'conflict', text: r.text, local, base: base ?? '', upstream, reason: base === null ? NO_BASE : whyConflict(r) }];
    return [{ path, kind, action: r.text === local ? 'unchanged' : 'update', text: r.text, reason: r.text === local ? '' : 'upstream change merged' }];
  }
  // mixed: every block of the upstream template, merged on its own; bytes outside the markers untouched
  const up = blocksOf(upstream);
  const lo = blocksOf(local);
  const ba = base === null ? new Map() : blocksOf(base);
  let text = local;
  const reasons = [];
  const held = [];
  for (const [name, u] of up) {
    const l = lo.get(name);
    if (!l) { held.push({ path, kind, action: 'missing-block', block: name, text: u.whole, reason: `block "${name}" has no LOOPS:BEGIN/END markers in the repo's file — insert the block by hand at its canonical position, then re-run` }); continue; }
    const b = ba.get(name)?.body ?? '';
    const r = merge3(l.body, b, u.body);
    if (r.conflicts || newSlots(r.text, l.body)) {
      held.push({ path, kind, action: 'conflict', block: name, text: r.text, local: l.body, base: b, upstream: u.body, reason: `block "${name}": ${base === null ? NO_BASE : whyConflict(r)}` });
      continue;
    }
    if (r.text !== l.body) { text = replaceBlockBody(text, name, r.text); reasons.push(`block "${name}" merged`); }
  }
  const clean = { path, kind, action: text === local ? 'unchanged' : 'update', text, reason: reasons.join(', ') };
  return held.length ? (clean.action === 'update' ? [...held, clean] : held) : [clean];
}

export function plan(root, plugin) {
  const manifest = readManifest(root) ?? { version: null, files: {}, frozen: [] };
  const out = [];
  for (const e of plugin.files) {
    if (e.kind === 'seeded') continue;
    if (manifest.frozen.includes(e.path)) { out.push({ path: e.path, kind: e.kind, action: 'frozen', reason: 'listed in manifest.frozen' }); continue; }
    out.push(...planFile(root, plugin, e));
  }
  for (const p of Object.keys(manifest.files))
    if (!plugin.files.some((e) => e.path === p)) out.push({ path: p, kind: manifest.files[p].kind, action: 'removed-upstream', reason: 'no longer in the plugin manifest — delete by hand if the repo does not use it' });
  return { manifest, items: out };
}

// Write the merged results, the new base and the manifest in one pass (every merge already succeeded).
// Paths in `noBase` get no base and no manifest entry, so the next apply stages them against upstream.
function commitPlan(root, plugin, items, manifest, noBase = new Set()) {
  for (const it of items) {
    if (it.action === 'update' || it.action === 'create') writeFile(join(root, it.path), it.text);
  }
  const files = {};
  for (const e of plugin.files) {
    if (e.kind === 'seeded' || noBase.has(e.path)) continue;
    const src = join(plugin.template, e.path);
    if (!existsSync(src)) continue;
    const text = read(src);
    writeFile(join(root, BASE_DIR, e.path), text);
    files[e.path] = { kind: e.kind, sha256: sha256(text) };
  }
  writeManifest(root, { version: plugin.version, installed: new Date().toISOString().slice(0, 10), frozen: manifest.frozen, files });
}

// A repo's file already differs from the template it is being initialised against: the text it was
// installed from is unknown, so recording this template as its base would make every later merge keep
// the repo's side silently. Mixed files are compared by their LOOPS blocks only.
function differsFromTemplate(root, plugin, e) {
  const lp = join(root, e.path);
  const up = join(plugin.template, e.path);
  if (!existsSync(lp) || !existsSync(up)) return false;
  if (e.kind === 'managed') return read(lp) !== read(up);
  const lo = blocksOf(read(lp));
  return [...blocksOf(read(up))].some(([name, b]) => lo.get(name)?.body !== b.body);
}

function dirtyManaged(root, paths) {
  if (!paths.length) return []; // "git status --" with no path would read the whole tree
  const r = git(root, ['status', '--porcelain', '--', ...paths]);
  if (r.error || r.status !== 0) return [];
  return r.stdout.split('\n').filter(Boolean).map((l) => l.slice(3).trim());
}

// --- commands --------------------------------------------------------------------------------------
export function cmdInit(root, plugin) {
  const m = readManifest(root);
  const noBase = new Set(plugin.files.filter((e) => e.kind !== 'seeded' && differsFromTemplate(root, plugin, e)).map((e) => e.path));
  commitPlan(root, plugin, [], m ?? { frozen: [] }, noBase);
  if (noBase.size) console.log(`loops-update: no base recorded for ${noBase.size} file(s) that differ from this template; the next apply stages them against upstream: ${[...noBase].join(', ')}`);
  const gi = join(root, '.gitignore');
  // .worktrees/ holds story worktrees (/loops:start); loops-check item 16 fails when it is not ignored.
  let cur = existsSync(gi) ? read(gi) : '';
  for (const line of [`${STAGE_DIR}/`, '.worktrees/']) {
    if (cur.split('\n').some((l) => l.trim() === line)) continue;
    cur = `${cur}${cur && !cur.endsWith('\n') ? '\n' : ''}${line}\n`;
  }
  writeFileSync(gi, cur);
  console.log(`loops-update: recorded base for ${Object.keys(readManifest(root).files).length} file(s) at version ${plugin.version} in ${MANIFEST}`);
  return 0;
}

export function cmdStatus(root, plugin) {
  const m = readManifest(root);
  if (!m) { console.log(`loops-update: no ${MANIFEST} — run "loops-update init --plugin <dir>" (or /loops:init)`); return 1; }
  const lines = [];
  const staged = existsSync(join(root, STAGE_DIR));
  const noBase = plugin ? plugin.files.filter((e) => e.kind !== 'seeded' && !m.frozen.includes(e.path) && !m.files[e.path] && existsSync(join(root, e.path))).map((e) => e.path) : [];
  const verdict = !plugin ? '' : plugin.version !== m.version ? 'update available'
    : staged ? 'update staged, not applied' : noBase.length ? `${noBase.length} file(s) without a base — run apply` : 'current';
  lines.push(`installed: ${m.version}${plugin ? `  plugin: ${plugin.version}  → ${verdict}` : ''}`);
  const drift = [];
  for (const [p, rec] of Object.entries(m.files)) {
    if (m.frozen.includes(p)) continue;
    const lp = join(root, p);
    if (!existsSync(lp)) { drift.push(`${p} (missing)`); continue; }
    if (rec.kind === 'managed' && sha256(read(lp)) !== rec.sha256) drift.push(p);
    if (rec.kind === 'mixed') {
      const bp = join(root, BASE_DIR, p);
      if (!existsSync(bp)) continue;
      const lo = blocksOf(read(lp)); const ba = blocksOf(read(bp));
      for (const [name, b] of ba) if (lo.get(name)?.body !== b.body) drift.push(`${p} (block ${name})`);
    }
  }
  lines.push(drift.length ? `modified locally since install: ${drift.join(', ')}` : 'no managed file modified locally');
  if (m.frozen.length) lines.push(`frozen (never updated): ${m.frozen.join(', ')}`);
  if (existsSync(join(root, STAGE_DIR))) lines.push(`pending update staged in ${STAGE_DIR}/ — resolve resolved/* then "loops-update --continue", or "--abort"`);
  for (const l of lines) console.log(`loops-update: ${l}`);
  return 0;
}

export function cmdApply(root, plugin) {
  if (existsSync(join(root, STAGE_DIR))) { console.error(`loops-update: ${STAGE_DIR}/ exists — finish it with --continue or drop it with --abort first`); return 1; }
  const { manifest, items } = plan(root, plugin);
  const touched = items.filter((i) => ['update', 'conflict', 'missing-block'].includes(i.action)).map((i) => i.path);
  const dirty = dirtyManaged(root, touched);
  if (dirty.length) { console.error(`loops-update: uncommitted changes in ${dirty.join(', ')} — commit or stash them first (git is the backup for this update)`); return 1; }
  const conflicts = items.filter((i) => i.action === 'conflict' || i.action === 'missing-block');
  for (const it of items) console.log(`loops-update: ${it.action.padEnd(14)} ${it.path}${it.reason ? `  — ${it.reason}` : ''}`);
  if (conflicts.length) {
    const stage = join(root, STAGE_DIR);
    for (const d of STAGE_SUBDIRS) mkdirSync(join(stage, d), { recursive: true });
    const state = { version: plugin.version, plugin: plugin.root, staged: {} };
    for (const it of conflicts) {
      const name = it.block ? `${it.path}#${it.block}` : it.path;
      if (it.action === 'conflict') {
        writeFile(join(stage, 'base', name), it.base);
        writeFile(join(stage, 'local', name), it.local);
        writeFile(join(stage, 'incoming', name), it.upstream);
      } else writeFile(join(stage, 'incoming', name), it.text);
      writeFile(join(stage, 'resolved', name), it.text);
      state.staged[name] = { path: it.path, block: it.block ?? null, action: it.action, localSha: sha256(read(join(root, it.path))) };
    }
    for (const it of items.filter((i) => i.action === 'update' || i.action === 'create')) { writeFile(join(stage, 'merged', it.path), it.text); state.staged[it.path] = { path: it.path, action: it.action, localSha: existsSync(join(root, it.path)) ? sha256(read(join(root, it.path))) : null }; }
    writeFile(join(stage, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
    console.error(`loops-update: ${conflicts.length} conflict(s) — nothing written to the tree. Edit ${STAGE_DIR}/resolved/<path> (diff3 markers: local | base | upstream), then "loops-update --continue".`);
    return 2;
  }
  commitPlan(root, plugin, items, manifest);
  stampVersion(root, plugin.version, manifest);
  console.log(`loops-update: applied ${items.filter((i) => i.action === 'update' || i.action === 'create').length} file(s); now at ${plugin.version}`);
  return 0;
}

// The LOOPS_VERSION stamp in docs/LOOP.md sits outside the managed blocks, so the merge never carries
// it; it must equal the manifest version (loops-check item 14), so it is written in the same run.
// An unfilled LOOPS_VERSION slot (still in braces) is left for /loops:init. This file must not contain
// a literal slot: the merge treats one as new text to fill and stages the file as a conflict.
function stampVersion(root, version, manifest) {
  const p = join(root, 'docs/LOOP.md');
  if (!existsSync(p) || manifest?.frozen?.includes('docs/LOOP.md')) return;
  const t = read(p);
  const n = t.replace(/\(loops v\d+\.\d+\.\d+\)/, `(loops v${version})`);
  if (n !== t) { writeFileSync(p, n); console.log(`loops-update: stamped       docs/LOOP.md  — loops v${version}`); }
}

export function cmdContinue(root) {
  const stage = join(root, STAGE_DIR);
  const sp = join(stage, 'state.json');
  if (!existsSync(sp)) { console.error(`loops-update: nothing staged in ${STAGE_DIR}/`); return 1; }
  const state = JSON.parse(read(sp));
  const plugin = readPlugin(state.plugin);
  const problems = [];
  const entries = Object.entries(state.staged);
  for (const [, rec] of entries) {
    const live = join(root, rec.path);
    const liveSha = existsSync(live) ? sha256(read(live)) : null;
    if (liveSha !== rec.localSha) problems.push(`${rec.path} changed since it was staged — abort and re-run apply`);
  }
  // Each file starts from its clean merge when one was staged (a mixed file's non-conflicting blocks),
  // else from the live text; resolved blocks are then applied on top, one after another.
  const texts = new Map();
  for (const [, rec] of entries)
    if (rec.action === 'update' || rec.action === 'create') texts.set(rec.path, read(join(stage, 'merged', rec.path)));
  for (const [name, rec] of entries) {
    if (rec.action === 'update' || rec.action === 'create') continue;
    const live = join(root, rec.path);
    const resolved = read(join(stage, 'resolved', name));
    if (hasMarkers(resolved)) { problems.push(`${name} still has conflict markers`); continue; }
    if (/\{\{[A-Z_0-9]+\}\}/.test(resolved) && !(existsSync(live) && /\{\{[A-Z_0-9]+\}\}/.test(read(live)))) { problems.push(`${name} still has an unfilled {{slot}}`); continue; }
    if (rec.block) {
      const t = replaceBlockBody(texts.get(rec.path) ?? read(live), rec.block, resolved);
      if (t === null) { problems.push(`${rec.path}: block ${rec.block} markers missing in the live file — insert the markers, then re-run --continue`); continue; }
      texts.set(rec.path, t);
    } else texts.set(rec.path, resolved);
  }
  if (problems.length) { for (const p of problems) console.error(`loops-update: ✗ ${p}`); return 1; }
  const byPath = new Map([...texts].map(([path, text]) => [path, { path, text }]));
  const manifest = readManifest(root) ?? { frozen: [] };
  commitPlan(root, plugin, [...byPath.values()].map((w) => ({ ...w, action: 'update' })), manifest);
  stampVersion(root, plugin.version, manifest);
  rmSync(stage, { recursive: true, force: true });
  console.log(`loops-update: applied ${byPath.size} file(s) from the staging directory; now at ${plugin.version}`);
  return 0;
}

export function cmdAbort(root) {
  const stage = join(root, STAGE_DIR);
  if (!existsSync(stage)) { console.log('loops-update: nothing staged'); return 0; }
  rmSync(stage, { recursive: true, force: true });
  console.log(`loops-update: ${STAGE_DIR}/ removed; the tree was never touched`);
  return 0;
}

// --- cli -------------------------------------------------------------------------------------------
const isMain = process.argv[1] && resolve(process.argv[1]).replace(/\\/g, '/').endsWith('loops-update.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const cmd = args.find((a) => !a.startsWith('--')) ?? (args.includes('--continue') ? '--continue' : args.includes('--abort') ? '--abort' : 'status');
  const pi = args.indexOf('--plugin');
  const pluginDir = pi >= 0 ? args[pi + 1] : process.env.CLAUDE_PLUGIN_ROOT;
  const root = process.cwd();
  try {
    let code = 1;
    if (cmd === 'init') code = cmdInit(root, readPlugin(pluginDir));
    else if (cmd === 'status') code = cmdStatus(root, pluginDir ? readPlugin(pluginDir) : null);
    else if (cmd === 'apply') code = cmdApply(root, readPlugin(pluginDir));
    else if (cmd === '--continue') code = cmdContinue(root);
    else if (cmd === '--abort') code = cmdAbort(root);
    else { console.error(`loops-update: unknown command "${cmd}" (init | status | apply | --continue | --abort)`); code = 1; }
    process.exit(code);
  } catch (e) {
    console.error(`loops-update: ${e.message}`);
    process.exit(1);
  }
}
