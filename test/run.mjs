#!/usr/bin/env node
// Fixture tests for template/scripts/loops-check.mjs and loops-gen.mjs.
// Each case builds a throwaway repo from template/, runs the real scripts, and asserts on exit code
// and output. Run from the harness repo root: `node test/run.mjs` (add a case name to run one).
import { cpSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, utimesSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(ROOT, 'template');
const WORK = mkdtempSync(join(tmpdir(), 'loops-test-'));

function walk(d) {
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function sh(cwd, cmd, args) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
const git = (cwd, ...args) => {
  const r = sh(cwd, 'git', args);
  if (r.code !== 0) throw new Error(`git ${args.join(' ')} failed in ${cwd}:\n${r.out}`);
  return r.out;
};
const check = (cwd) => sh(cwd, process.execPath, ['scripts/loops-check.mjs']);
const gen = (cwd, ...args) => sh(cwd, process.execPath, ['scripts/loops-gen.mjs', ...args]);

// A filled-in repo: every slot replaced, loops:init comments removed, ADR-0001 present, git initialised.
function fixture(name, { hook = true } = {}) {
  const dir = join(WORK, name);
  mkdirSync(dir, { recursive: true });
  cpSync(TEMPLATE, dir, { recursive: true });
  for (const p of walk(dir)) {
    if (!p.endsWith('.md')) continue;
    let t = readFileSync(p, 'utf8');
    t = t.replace(/<!-- loops-init:[\s\S]*?-->\n?/g, '').replace(/\{\{[A-Z_0-9]+\}\}/g, 'x');
    writeFileSync(p, t);
  }
  writeFileSync(join(dir, 'docs/decisions/ADR-0001-stack.md'), '# ADR-0001\n\n- **Status:** Accepted\n- **Date:** 2026-01-01\n');
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'test');
  git(dir, 'config', 'core.autocrlf', 'false');
  if (hook) {
    mkdirSync(join(dir, '.githooks'), { recursive: true });
    writeFileSync(join(dir, '.githooks/pre-push'), '#!/bin/sh\nnode scripts/loops-check.mjs\n');
    git(dir, 'config', 'core.hooksPath', '.githooks');
  }
  return dir;
}

function story(dir, id, { status = 'ready', owns = [], consumes = [], proof, dependsOn = [] } = {}) {
  const proofRows = proof ?? [`T-${id.replace('ST-', 'S')}-1 | unit | behaviour of ${id}${status === 'done' ? ' | ✅' : ''}`];
  const text = [
    '---',
    `id: ${id}`,
    `title: story ${id}`,
    'trace: US-1',
    'class: normal',
    `status: ${status}`,
    `depends_on: [${dependsOn.join(', ')}]`,
    `consumes: [${consumes.join(', ')}]`,
    `owns: [${owns.join(', ')}]`,
    'opens: []',
    'adrs: []',
    'proof:',
    ...proofRows.map((p) => `  - ${p}`),
    '---',
    '',
    `# ${id}`,
    '',
  ].join('\n');
  writeFileSync(join(dir, `docs/stories/${id}-x.md`), text);
}

function commitAll(dir, msg = 'wip') {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', msg);
}

function write(dir, path, text) {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), text);
}


function spec(dir, id, { status = 'accepted', intent = 'INT-001', opens = [], adrs = [] } = {}) {
  write(dir, `docs/specs/${id}-x.md`, ['---', `id: ${id}`, `title: spec ${id}`, `intent: ${intent}`, `status: ${status}`, 'accepted_by: po', 'accepted_on: 2026-01-01', `adrs: [${adrs.join(', ')}]`, `opens: [${opens.join(', ')}]`, '---', '', `# ${id}`, ''].join('\n'));
}
function intent(dir, id, { status = 'accepted' } = {}) {
  write(dir, `docs/intents/${id}-x.md`, ['---', `id: ${id}`, `title: intent ${id}`, 'author: a', `status: ${status}`, 'opened: 2026-01-01', 'source: idea', 'spec: []', '---', '', `# ${id}`, ''].join('\n'));
}
function adr(dir, id, status) {
  write(dir, `docs/decisions/${id}-x.md`, `# ${id}\n\n${status === null ? '' : `- **Status:** ${status}\n`}- **Date:** 2026-01-01\n`);
}
function storyWith(dir, id, extra, opts = {}) {
  story(dir, id, opts);
  const p = join(dir, `docs/stories/${id}-x.md`);
  let t = readFileSync(p, 'utf8');
  for (const [k, v] of Object.entries(extra)) t = t.replace(new RegExp(`^${k}: .*$`, 'm'), `${k}: ${v}`);
  writeFileSync(p, t);
}
// ---------------------------------------------------------------------------
const cases = [];
const test = (name, fn) => cases.push({ name, fn });
function expect(cond, msg, out) {
  if (!cond) throw new Error(`${msg}${out ? `\n--- output ---\n${out.trim()}` : ''}`);
}

test('T-CORE-1 baseline: filled repo with a wired hook passes', () => {
  const d = fixture('baseline');
  story(d, 'ST-001', { owns: ['apps/a/**'] });
  gen(d);
  const r = check(d);
  expect(r.code === 0, 'expected exit 0', r.out);
  expect(/declared in: \.githooks\/pre-push/.test(r.out), 'expected the hook to count as invoker', r.out);
});

test('invoker: .githooks without core.hooksPath does not count', () => {
  const d = fixture('hooks-path', { hook: false });
  write(d, '.githooks/pre-push', '#!/bin/sh\nnode scripts/loops-check.mjs\n');
  const r = check(d);
  expect(r.code === 1, 'expected a failure: git never runs this hook', r.out);
  expect(/core\.hooksPath/.test(r.out), 'expected the message to name core.hooksPath', r.out);
});

test('invoker: a Makefile target alone does not count', () => {
  const d = fixture('makefile', { hook: false });
  write(d, 'Makefile', 'check:\n\tnode scripts/loops-check.mjs\n');
  const r = check(d);
  expect(r.code === 1, 'expected a failure: a make target is an alias, like a package.json script', r.out);
});

test('invoker: a comment mentioning the script does not count', () => {
  const d = fixture('comment', { hook: false });
  write(d, '.gitlab-ci.yml', '# TODO: someday run loops-check here\nstages: [test]\n');
  const r = check(d);
  expect(r.code === 1, 'expected a failure: comments do not run', r.out);
});

test('invoker: two CI systems configured gives a note', () => {
  const d = fixture('two-ci', { hook: false });
  write(d, '.gitlab-ci.yml', 'check:\n  script:\n    - node scripts/loops-check.mjs\n');
  write(d, '.github/workflows/ci.yml', 'jobs:\n  build:\n    steps:\n      - run: echo hi\n');
  const r = check(d);
  expect(r.code === 0, 'expected exit 0: the GitLab job is a real invoker', r.out);
  expect(/two CI systems/.test(r.out), 'expected a note about two CI systems', r.out);
});

test('owns: two ready stories that overlap only get a note (F3)', () => {
  const d = fixture('ready-overlap');
  story(d, 'ST-001', { owns: ['apps/web/**'] });
  story(d, 'ST-002', { owns: ['apps/web/src/sets/**'] });
  gen(d);
  const r = check(d);
  expect(r.code === 0, 'expected exit 0: nobody has started either story', r.out);
  expect(!/both active/.test(r.out), 'expected no overlap failure', r.out);
});

test('owns: two in-progress stories that overlap fail', () => {
  const d = fixture('progress-overlap');
  story(d, 'ST-001', { status: 'in-progress', owns: ['apps/web/**'] });
  story(d, 'ST-002', { status: 'in-progress', owns: ['apps/web/src/sets/**'] });
  gen(d);
  const r = check(d);
  expect(r.code === 1, 'expected an overlap failure', r.out);
});

test('claims: a story started in another worktree is seen from the main checkout (F1)', () => {
  const d = fixture('claims');
  story(d, 'ST-001', { owns: ['apps/web/**'] });
  gen(d);
  commitAll(d, 'init');
  const wt = join(WORK, 'claims-st001');
  git(d, 'worktree', 'add', '-q', wt, '-b', 'story/ST-001-web', 'main');
  story(wt, 'ST-001', { status: 'in-progress', owns: ['apps/web/**'] });
  gen(wt);
  commitAll(wt, 'docs(ST-001): start');

  const listed = gen(d, '--claims');
  expect(listed.code === 0 && /ST-001/.test(listed.out) && /story\/ST-001-web/.test(listed.out), 'expected --claims to list ST-001 and its branch', listed.out);

  story(d, 'ST-002', { status: 'in-progress', owns: ['apps/web/src/sets/**'] });
  gen(d);
  const r = check(d);
  expect(r.code === 1 && /ST-001/.test(r.out) && /ST-002/.test(r.out), 'expected an overlap failure between the claimed ST-001 and ST-002', r.out);
});

test('claims: a merged story branch is no longer a claim', () => {
  const d = fixture('claims-merged');
  story(d, 'ST-001', { owns: ['apps/web/**'] });
  gen(d);
  commitAll(d, 'init');
  git(d, 'checkout', '-q', '-b', 'story/ST-001');
  write(d, 'apps/web/a.ts', 'export {};\n');
  commitAll(d, 'feat (ST-001)');
  git(d, 'checkout', '-q', 'main');
  git(d, 'merge', '-q', '--no-edit', 'story/ST-001');
  const listed = gen(d, '--claims');
  expect(!/ST-001/.test(listed.out), 'expected no claim after merge', listed.out);
});

test('generated tables: conflict markers fail with the command to run (F2)', () => {
  const d = fixture('conflict');
  story(d, 'ST-001', { owns: ['apps/a/**'] });
  gen(d);
  const p = join(d, 'docs/stories/README.md');
  const t = readFileSync(p, 'utf8').replace('<!-- LOOPS:GEN-END backlog -->', '<<<<<<< HEAD\n| x |\n=======\n| y |\n>>>>>>> story/ST-002\n<!-- LOOPS:GEN-END backlog -->');
  writeFileSync(p, t);
  const r = check(d);
  expect(r.code === 1 && /conflict marker/.test(r.out) && /loops-gen/.test(r.out), 'expected a conflict-marker failure naming loops-gen', r.out);
  gen(d);
  const r2 = check(d);
  expect(r2.code === 0, 'expected loops-gen to clear the conflict', r2.out);
});

test('proof: a ✅ row with no test mentioning its id gets a note (F5)', () => {
  const d = fixture('proof');
  story(d, 'ST-001', { status: 'done', owns: ['apps/a/**'], proof: ['T-WEB-1 | unit | list renders | ✅', 'T-WEB-2 | manual | looks right | ✅'] });
  gen(d);
  commitAll(d, 'init');
  const r = check(d);
  expect(r.code === 0, 'expected a note, not a failure', r.out);
  expect(/T-WEB-1/.test(r.out) && !/T-WEB-2/.test(r.out), 'expected a note for T-WEB-1 only (manual proof is exempt)', r.out);
  write(d, 'apps/a/list.test.ts', "test('T-WEB-1 list renders', () => {});\n");
  commitAll(d, 'test');
  const r2 = check(d);
  expect(!/T-WEB-1/.test(r2.out), 'expected the note to go away once a test names the id', r2.out);
});

test('consumes: a file that exists only in the working tree is not on main (F6)', () => {
  const d = fixture('consumes');
  story(d, 'ST-001', { status: 'in-progress', owns: ['apps/a/**'], consumes: ['packages/spec/openapi.yaml'] });
  gen(d);
  commitAll(d, 'init');
  write(d, 'packages/spec/openapi.yaml', 'openapi: 3.1.0\n');
  gen(d);
  const r = check(d);
  expect(r.code === 1 && /not on main/.test(r.out), 'expected the consumes blocker to stay until the file is on main', r.out);
  commitAll(d, 'spec');
  gen(d);
  const r2 = check(d);
  expect(r2.code === 0, 'expected OK once the file is committed on main', r2.out);
});

test('stray files: apps/website is not inside owns apps/web/** (F7)', () => {
  const d = fixture('stray');
  story(d, 'ST-001', { status: 'in-progress', owns: ['apps/web/**'] });
  gen(d);
  commitAll(d, 'init');
  write(d, 'apps/website/a.ts', 'export {};\n');
  write(d, 'apps/web/b.ts', 'export {};\n');
  const r = check(d);
  expect(/apps\/website\/a\.ts/.test(r.out), 'expected a note naming apps/website/a.ts', r.out);
  expect(!/apps\/web\/b\.ts/.test(r.out), 'expected apps/web/b.ts to count as owned', r.out);
});

test('messages: check output is English only', () => {
  const d = fixture('english');
  story(d, 'ST-001', { status: 'in-progress', owns: ['apps/a/**'], consumes: ['missing/file.yaml'] });
  gen(d);
  const r = check(d);
  expect(r.code === 1, 'expected the consumes failure', r.out);
  expect(!/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(r.out), 'expected no Vietnamese text in check output', r.out);
});

test('front matter: a multi-line flow list still parses (L31)', () => {
  const d = fixture('flow-list');
  write(d, 'docs/stories/ST-001-x.md', [
    '---', 'id: ST-001', 'title: t', 'trace: US-1', 'class: normal', 'status: ready', 'depends_on: []', 'consumes: []',
    'owns:', '  [', '    apps/a/**,', '    apps/b/**,', '  ]', 'opens: []', 'adrs: []', 'proof:', '  - T-A-1 | unit | x', '---', '',
  ].join('\n'));
  const g = gen(d);
  expect(g.code === 0, 'expected loops-gen to parse the flow list', g.out);
  const r = check(d);
  expect(r.code === 0, 'expected OK', r.out);
});

// ---------------------------------------------------------------------------

test('T-DOC-1 spec: a story traced to a draft spec is not Ready and the spec is named', () => {
  const d = fixture('spec-draft');
  intent(d, 'INT-001'); spec(d, 'SPEC-002', { status: 'draft' });
  storyWith(d, 'ST-010', { trace: 'SPEC-002' }, { owns: ['apps/a/**'] });
  gen(d);
  const r = check(d);
  expect(r.code === 1 && /ST-010.*SPEC-002 not accepted/.test(r.out), 'expected a failure naming SPEC-002 and ST-010', r.out);
});

test('T-DOC-2 spec: a trace that names a missing SPEC or INT fails with the id', () => {
  const d = fixture('spec-missing');
  storyWith(d, 'ST-011', { trace: 'SPEC-009, INT-009' }, { owns: ['apps/a/**'], status: 'draft' });
  gen(d);
  const r = check(d);
  expect(r.code === 1 && /SPEC-009/.test(r.out) && /INT-009/.test(r.out), 'expected both ids in the failure', r.out);
});

test('T-DOC-3 spec: accepted with unresolved opens is a failure', () => {
  const d = fixture('spec-accepted-open');
  intent(d, 'INT-001'); spec(d, 'SPEC-003', { status: 'accepted', opens: ['OPEN-004'] });
  gen(d);
  const r = check(d);
  expect(r.code === 1 && /SPEC-003.*accepted.*OPEN-004/.test(r.out), 'expected the accepted-with-opens failure', r.out);
});

test('T-CORE-4 adr: a Proposed ADR blocks a high-risk story and the backlog says so', () => {
  const d = fixture('adr-proposed-high');
  adr(d, 'ADR-0009', 'Proposed');
  storyWith(d, 'ST-020', { class: 'high-risk', adrs: '[ADR-0009]' }, { owns: ['apps/a/**'] });
  gen(d);
  const backlog = readFileSync(join(d, 'docs/stories/README.md'), 'utf8');
  expect(/ST-020.*ADR-0009 not Accepted/.test(backlog), 'expected the backlog Blocked by column to name ADR-0009', backlog);
  const r = check(d);
  expect(r.code === 1 && /ST-020.*ready.*ADR-0009/.test(r.out), 'expected a failure for the ready high-risk story', r.out);
});

test('T-CORE-5 adr: the same Proposed ADR only notes a normal story', () => {
  const d = fixture('adr-proposed-normal');
  adr(d, 'ADR-0009', 'Proposed');
  storyWith(d, 'ST-021', { class: 'normal', adrs: '[ADR-0009]' }, { owns: ['apps/a/**'] });
  gen(d);
  const r = check(d);
  expect(r.code === 0 && /note.*ST-021.*ADR-0009 not Accepted/.test(r.out), 'expected a note and exit 0', r.out);
});

test('T-CORE-6 adr: an ADR without a Status line is treated as Proposed and noted', () => {
  const d = fixture('adr-no-status');
  adr(d, 'ADR-0010', null);
  storyWith(d, 'ST-022', { class: 'high-risk', adrs: '[ADR-0010]' }, { owns: ['apps/a/**'] });
  gen(d);
  const r = check(d);
  expect(r.code === 1 && /ADR-0010.*no Status line/.test(r.out) && /no "- \*\*Status:\*\*" line/.test(r.out), 'expected the no-status note and the Ready failure', r.out);
});


test('T-CORE-7 hooks: settings.json naming a missing hook script fails; no hooks block is a note', () => {
  const d = fixture('hooks-wired');
  story(d, 'ST-001', { owns: ['apps/a/**'] });
  gen(d);
  let r = check(d);
  expect(r.code === 0 && /hooks wired: owns-guard\.mjs/.test(r.out), 'expected the shipped settings.json to be reported as wired', r.out);
  rmSync(join(d, '.claude/hooks/adr-guard.mjs'));
  r = check(d);
  expect(r.code === 1 && /adr-guard\.mjs but the file does not exist/.test(r.out), 'expected a failure for the missing script', r.out);
  write(d, '.claude/settings.json', '{ "permissions": { "allow": [] } }');
  r = check(d);
  expect(r.code === 0 && /no hooks\.PreToolUse block/.test(r.out), 'expected a note when no hooks are wired', r.out);
});

// A bare remote plus two clones, each a filled repo with the hook wired (per clone, like a real team).
function team(name) {
  const d = fixture(`${name}-seed`);
  story(d, 'ST-001', { owns: ['apps/web/**'] });
  story(d, 'ST-002', { owns: ['apps/web/src/sets/**'] });
  gen(d);
  commitAll(d, 'seed');
  const remote = join(WORK, `${name}-remote.git`);
  git(d, 'clone', '-q', '--bare', d, remote);
  const clone = (n) => {
    const c = join(WORK, `${name}-${n}`);
    git(WORK, 'clone', '-q', remote, c);
    git(c, 'config', 'user.email', 'test@example.com'); git(c, 'config', 'user.name', n); git(c, 'config', 'core.autocrlf', 'false'); git(c, 'config', 'core.hooksPath', '.githooks');
    return c;
  };
  return { a: clone('a'), b: clone('b') };
}

test('T-PAR-1 claims: a story branch pushed from clone A is seen in clone B after --fetch and blocks an overlap there', () => {
  const { a, b } = team('par1');
  git(a, 'checkout', '-q', '-b', 'story/ST-001');
  story(a, 'ST-001', { status: 'in-progress', owns: ['apps/web/**'] });
  gen(a); commitAll(a, 'docs(ST-001): start');
  git(a, 'push', '-q', '-u', 'origin', 'story/ST-001');
  let listed = gen(b, '--claims');
  expect(!/ST-001/.test(listed.out), 'expected clone B not to see the claim before fetching', listed.out);
  listed = gen(b, '--claims', '--fetch');
  expect(listed.code === 0 && /fetched/.test(listed.out) && /ST-001\torigin\/story\/ST-001/.test(listed.out), 'expected the fetched claim with its remote branch', listed.out);
  story(b, 'ST-002', { status: 'in-progress', owns: ['apps/web/src/sets/**'] });
  gen(b);
  const r = check(b);
  expect(r.code === 1 && /ST-001 and ST-002 are both active/.test(r.out), 'expected the overlap failure in clone B', r.out);
});

test('T-PAR-2 next-id: counts ids on main, on unmerged remote branches and in the working tree', () => {
  const { a, b } = team('par2');
  intent(a, 'INT-001'); write(a, 'docs/decisions/OPEN.md', readFileSync(join(a, 'docs/decisions/OPEN.md'), 'utf8') + '| OPEN-004 | 2026-01-01 | q | p | ST-001 | open | |\n');
  commitAll(a, 'main ids'); git(a, 'push', '-q', 'origin', 'main');
  git(a, 'checkout', '-q', '-b', 'story/ST-002-ids');
  intent(a, 'INT-003'); write(a, 'docs/decisions/OPEN.md', readFileSync(join(a, 'docs/decisions/OPEN.md'), 'utf8') + '| OPEN-007 | 2026-01-01 | q | p | ST-002 | open | |\n');
  commitAll(a, 'branch ids'); git(a, 'push', '-q', '-u', 'origin', 'story/ST-002-ids');
  git(b, 'fetch', '-q', '--prune', 'origin'); git(b, 'pull', '-q', '--ff-only', 'origin', 'main');
  const id = (k) => gen(b, '--next-id', k).out.trim();
  expect(id('INT') === 'INT-004', `expected INT-004 (main has INT-001, remote branch INT-003), got ${id('INT')}`);
  expect(id('OPEN') === 'OPEN-008', `expected OPEN-008, got ${id('OPEN')}`);
  expect(id('ST') === 'ST-003', `expected ST-003, got ${id('ST')}`);
  expect(id('SPEC') === 'SPEC-001', `expected SPEC-001 when none exists, got ${id('SPEC')}`);
  expect(id('ADR') === 'ADR-0002', `expected ADR-0002 (fixture has ADR-0001), got ${id('ADR')}`);
  write(b, 'docs/intents/INT-009-uncommitted.md', '---\nid: INT-009\ntitle: t\nauthor: a\nstatus: draft\nopened: 2026-01-01\nsource: idea\nspec: []\n---\n');
  expect(id('INT') === 'INT-010', `expected the working tree to count too, got ${id('INT')}`);
});

test('T-PAR-3 duplicates fail with both locations; a stale fetch is a note', () => {
  const d = fixture('par3-dup');
  intent(d, 'INT-001'); write(d, 'docs/intents/INT-001-again.md', readFileSync(join(d, 'docs/intents/INT-001-x.md'), 'utf8'));
  write(d, 'docs/decisions/OPEN.md', readFileSync(join(d, 'docs/decisions/OPEN.md'), 'utf8') + '| OPEN-001 | 2026-01-01 | q | p | ST-001 | open | |\n| OPEN-001 | 2026-01-01 | q2 | p | ST-001 | open | |\n');
  let r = check(d);
  expect(r.code === 1 && /INT-001 is used by 2 files \(INT-001-again\.md, INT-001-x\.md\)/.test(r.out), 'expected the duplicate intent failure naming both files', r.out);
  expect(/OPEN-001 already appears on line/.test(r.out), 'expected the duplicate OPEN row failure', r.out);
  expect(!/last fetched|never fetched/.test(r.out), 'expected no fetch note without a remote', r.out);
  const { b } = team('par3-stale');
  const fh = join(b, '.git', 'FETCH_HEAD');
  git(b, 'fetch', '-q', 'origin');
  const old = new Date(Date.now() - 3 * 86_400_000);
  utimesSync(fh, old, old);
  r = check(b);
  expect(r.code === 0 && /remote refs last fetched 3 day\(s\) ago/.test(r.out), 'expected the stale-fetch note', r.out);
  git(b, 'fetch', '-q', 'origin');
  r = check(b);
  expect(!/last fetched/.test(r.out), 'expected the note gone after a fetch', r.out);
});

test('T-CORE-8 hooks: a hook command with an unbraced $CLAUDE_PROJECT_DIR fails (PowerShell reads it as $null)', () => {
  const d = fixture('hooks-powershell');
  story(d, 'ST-001', { owns: ['apps/a/**'] });
  gen(d);
  let r = check(d);
  expect(r.code === 0, 'expected the shipped settings.json (braced form) to pass', r.out);
  write(d, '.claude/settings.json', JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/owns-guard.mjs"' }] }] } }));
  r = check(d);
  expect(r.code === 1 && /without braces/.test(r.out) && /PowerShell/.test(r.out), 'expected a failure naming the PowerShell expansion', r.out);
});

test('T-ENF-1 enforced-by: a boundary ADR without the line is noted, with it is silent', () => {
  const d = fixture('enforced-by');
  write(d, 'AGENTS.md', `${readFileSync(join(d, 'AGENTS.md'), 'utf8')}\n- **No raw SQL outside the repository layer.** → ADR-0009\n`);
  write(d, 'docs/decisions/ADR-0009-sql.md', '# ADR-0009\n\n- **Status:** Accepted\n- **Date:** 2026-01-01\n');
  let r = check(d);
  expect(r.code === 0 && /ADR-0009 backs an AGENTS\.md boundary but has no "- \*\*Enforced by:\*\*" line/.test(r.out) && /loops:encode/.test(r.out), 'expected a note naming ADR-0009 and /loops:encode', r.out);
  write(d, 'docs/decisions/ADR-0009-sql.md', '# ADR-0009\n\n- **Status:** Accepted\n- **Date:** 2026-01-01\n- **Enforced by:** `scripts/no-raw-sql.mjs` (T-SQL-1 positive, T-SQL-2 negative)\n');
  r = check(d);
  expect(r.code === 0 && !/ADR-0009 backs/.test(r.out), 'expected no note once the line exists', r.out);
});

test('T-WT-1 worktrees: one outside .worktrees/ is a note; inside it is silent once git-ignored', () => {
  const d = fixture('wt-place');
  commitAll(d, 'init');
  const sibling = join(WORK, 'wt-place-st001');
  git(d, 'worktree', 'add', '-q', sibling, '-b', 'story/ST-001', 'main');
  let r = check(d);
  expect(r.code === 0 && /1 worktree\(s\) outside \.worktrees\//.test(r.out), 'expected a note naming the sibling worktree', r.out);
  git(d, 'worktree', 'remove', '--force', sibling);
  write(d, '.gitignore', '.worktrees/\n');
  commitAll(d, 'ignore worktrees');
  git(d, 'worktree', 'add', '-q', join(d, '.worktrees', 'st-002'), '-b', 'story/ST-002', 'main');
  r = check(d);
  expect(r.code === 0 && !/outside \.worktrees/.test(r.out) && !/not in \.gitignore/.test(r.out), 'expected silence for an ignored in-repo worktree', r.out);
});

test('T-WT-2 worktrees: a worktree in .worktrees/ that git does not ignore fails', () => {
  const d = fixture('wt-unignored');
  commitAll(d, 'init');
  git(d, 'worktree', 'add', '-q', join(d, '.worktrees', 'st-001'), '-b', 'story/ST-001', 'main');
  const r = check(d);
  expect(r.code === 1 && /\.worktrees\/ holds a worktree but is not in \.gitignore/.test(r.out), 'expected a failure naming .gitignore', r.out);
});

test('T-ENF-2 enforcement levels: the invoker is reported as declared, not as proof', () => {
  const d = fixture('levels', { hook: false });
  write(d, '.gitlab-ci.yml', 'check:\n  script:\n    - node scripts/loops-check.mjs\n');
  const r = check(d);
  expect(r.code === 0 && /declared in: \.gitlab-ci\.yml — a declaration in the repo is not proof the job ran on this revision; branch protection is unverified/.test(r.out), 'expected the four-levels wording', r.out);
  expect(!/invoked from/.test(r.out), 'expected the old wording gone', r.out);
});

const only = process.argv[2];
let failed = 0;
for (const c of cases) {
  if (only && !c.name.includes(only)) continue;
  try {
    c.fn();
    console.log(`ok   ${c.name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${c.name}\n     ${String(e.message).split('\n').join('\n     ')}`);
  }
}
try { rmSync(WORK, { recursive: true, force: true }); } catch { /* Windows may keep a worktree handle open */ }
if (existsSync(WORK)) console.log(`(fixtures left in ${WORK})`);
console.log(failed ? `\n${failed} case(s) failed` : '\nall cases passed');
process.exit(failed ? 1 : 0);
