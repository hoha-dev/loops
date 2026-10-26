#!/usr/bin/env node
// Fixture tests for template/.claude/hooks/*.mjs. Each case builds a throwaway repo (template/ copied,
// git initialised, a story branch with owns), pipes a PreToolUse JSON into the real hook, and asserts
// on exit code, stderr/stdout and duration. Run from the loops repo root: `node test/hooks.mjs`.
import './git-env.mjs';
import { cpSync, mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(ROOT, 'template');
const WORK = mkdtempSync(join(tmpdir(), 'loops-hooks-'));
const HOOKS = join(TEMPLATE, '.claude', 'hooks');

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed:\n${r.stdout}${r.stderr}`);
  return r.stdout;
};

function repo(name, { branch = 'story/ST-019-x', owns = ['apps/web/**'] } = {}) {
  const dir = join(WORK, name);
  mkdirSync(dir, { recursive: true });
  cpSync(TEMPLATE, dir, { recursive: true });
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 't');
  writeFileSync(join(dir, 'docs/stories/ST-019-x.md'), `---\nid: ST-019\ntitle: x\ntrace: US-1\nclass: normal\nstatus: in-progress\ndepends_on: []\nconsumes: []\nowns: [${owns.join(', ')}]\nopens: []\nadrs: []\nproof:\n  - T-X-1 | unit | x\n---\n# ST-019\n`);
  writeFileSync(join(dir, 'docs/decisions/ADR-0001-x.md'), '# ADR-0001\n\n- **Status:** Accepted\n- **Date:** 2026-01-01\n\n## Decision\n\nx\n');
  writeFileSync(join(dir, 'docs/decisions/ADR-0002-x.md'), '# ADR-0002\n\n- **Status:** Proposed\n- **Date:** 2026-01-01\n\n## Decision\n\ny\n');
  writeFileSync(join(dir, 'docs/stories/README.md'), '# backlog\n\n<!-- LOOPS:GEN backlog -->\n| ID | Story |\n| --- | --- |\n| [ST-019](ST-019-x.md) | x |\n<!-- LOOPS:GEN-END backlog -->\n\nfree text below\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'seed');
  if (branch) git(dir, 'checkout', '-q', '-b', branch);
  return dir;
}

// Run one hook with a JSON input, from the repo as cwd (the hook reads cwd from the JSON).
function hook(name, dir, input, env = {}) {
  const t0 = process.hrtime.bigint();
  const r = spawnSync(process.execPath, [join(HOOKS, `${name}.mjs`)], {
    cwd: dir, encoding: 'utf8', input: input === null ? '' : JSON.stringify({ cwd: dir, hook_event_name: 'PreToolUse', ...input }),
    env: { ...process.env, LOOPS_FIX_TASK: '', ...env },
  });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { code: r.status, out: r.stdout, err: r.stderr, ms };
}
const edit = (file_path, old_string = 'a') => ({ tool_name: 'Edit', tool_input: { file_path, old_string, new_string: 'b' } });
const write = (file_path) => ({ tool_name: 'Write', tool_input: { file_path, content: 'x' } });
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
const denied = (r) => { try { return JSON.parse(r.out).hookSpecificOutput?.permissionDecision === 'deny'; } catch { return false; } };

const cases = [];
const test = (name, fn) => cases.push({ name, fn });
function expect(cond, msg, r) {
  if (!cond) throw new Error(`${msg}${r ? `\n--- exit ${r.code} ---\n${r.out}${r.err}` : ''}`);
}

test('T-HOOK-1 owns-guard: edit outside owns is blocked with the fix; inside owns is allowed', () => {
  const d = repo('owns');
  let r = hook('owns-guard', d, edit(join(d, 'apps/api/src/x.ts')));
  expect(r.code === 0 && denied(r) && /ST-019/.test(r.out) && /apps\/api\/src\/x\.ts/.test(r.out) && /owns/.test(r.out) && /loops-check/.test(r.out), 'expected exit 2 naming story, path, owns and loops-check', r);
  r = hook('owns-guard', d, edit(join(d, 'apps/web/src/y.tsx')));
  expect(r.code === 0 && !r.err, 'expected allow inside owns', r);
  r = hook('owns-guard', d, edit(join(d, 'docs/stories/ST-019-x.md')));
  expect(r.code === 0, 'expected allow for the story file itself', r);
  r = hook('owns-guard', d, edit('apps/api/relative.ts'));
  expect(r.code === 0 && denied(r), 'expected a relative path to be resolved against cwd and blocked', r);
});

test('T-HOOK-1b owns-guard: not on a story branch, nothing is checked', () => {
  const d = repo('owns-main', { branch: null });
  const r = hook('owns-guard', d, edit(join(d, 'apps/api/src/x.ts')));
  expect(r.code === 0 && !r.err, 'expected allow on main', r);
});

test('T-HOOK-1c owns-guard: works from a linked worktree (.git is a file)', () => {
  const d = repo('owns-wt', { branch: null });
  const wt = join(WORK, 'owns-wt-st019');
  git(d, 'worktree', 'add', '-q', wt, '-b', 'story/ST-019');
  const r = hook('owns-guard', wt, edit(join(wt, 'apps/api/src/x.ts')));
  expect(r.code === 0 && denied(r) && /ST-019/.test(r.out), 'expected the worktree branch to be read from the gitdir file', r);
});

test('T-HOOK-2 stage-guard: git add -A / . / --all and commit -a are blocked; git add <path> is allowed', () => {
  const d = repo('stage');
  for (const c of ['git add -A', 'git add .', 'git add --all && git commit -m x', 'git commit -am "x"', 'git commit -a -m x', 'cd apps && git add -A',
    // F4: the spellings an agent reaches for once the plain ones are blocked
    'git add -- .', 'git add ./', 'git add -u', 'git add --update', "git add '*'", 'git add :/', 'git add src/ .', 'git -C apps add -- ./']) {
    const r = hook('stage-guard', d, bash(c));
    expect(r.code === 0 && denied(r) && /stage-guard/.test(r.out), `expected block for: ${c}`, r);
  }
  // The PowerShell tool (Windows) carries the same command field.
  const ps = hook('stage-guard', d, { tool_name: 'PowerShell', tool_input: { command: 'git add -A; git commit -m x' } });
  expect(ps.code === 0 && denied(ps), 'expected the PowerShell tool to be guarded too', ps);
  for (const c of ['git add apps/web/src/y.tsx docs/stories/ST-019-x.md', 'git commit -m "feat: x"', 'git status', 'npm test', 'git add -p', 'git add ./src/cli.mjs', 'git add -- src/x.ts', 'git add .github/workflows/ci.yml']) {
    const r = hook('stage-guard', d, bash(c));
    expect(r.code === 0 && !r.err, `expected allow for: ${c}`, r);
  }
});

test('T-HOOK-3 generated-guard: an Edit inside a LOOPS:GEN block is denied, outside it allowed, a Write is denied', () => {
  const d = repo('gen');
  let r = hook('generated-guard', d, edit(join(d, 'docs/stories/README.md'), '| [ST-019](ST-019-x.md) | x |'));
  expect(r.code === 0 && denied(r) && /loops-gen/.test(r.out), 'expected a JSON deny naming loops-gen', r);
  r = hook('generated-guard', d, edit(join(d, 'docs/stories/README.md'), 'free text below'));
  expect(r.code === 0 && !denied(r), 'expected allow outside the block', r);
  r = hook('generated-guard', d, write(join(d, 'docs/TEST_MATRIX.md')));
  expect(r.code === 0 && denied(r), 'expected a Write of TEST_MATRIX.md to be denied', r);
  r = hook('generated-guard', d, edit(join(d, 'apps/web/src/y.tsx')));
  expect(r.code === 0 && !denied(r), 'expected other files untouched', r);
});

test('T-HOOK-4 adr-guard: Accepted ADR body is blocked, Proposed ADR and new ADR allowed, status flip allowed', () => {
  const d = repo('adr');
  let r = hook('adr-guard', d, edit(join(d, 'docs/decisions/ADR-0001-x.md'), 'x'));
  expect(r.code === 0 && denied(r) && /ADR-0001/.test(r.out) && /Supersedes/.test(r.out), 'expected block with the supersede route', r);
  r = hook('adr-guard', d, edit(join(d, 'docs/decisions/ADR-0002-x.md'), 'y'));
  expect(r.code === 0 && !r.err, 'expected a Proposed ADR to be editable', r);
  r = hook('adr-guard', d, write(join(d, 'docs/decisions/ADR-0003-new.md')));
  expect(r.code === 0 && !r.err, 'expected a new ADR file to be allowed', r);
  r = hook('adr-guard', d, edit(join(d, 'docs/decisions/ADR-0001-x.md'), '- **Status:** Accepted'));
  expect(r.code === 0, 'expected the status flip to Superseded to be allowed', r);
  r = hook('adr-guard', d, write(join(d, 'docs/decisions/ADR-0001-x.md')));
  expect(r.code === 0 && denied(r), 'expected a Write over an Accepted ADR to be blocked', r);
});

test('T-HOOK-7 owns-guard: under decisions/intents/specs a story may create files and edit OPEN.md, not edit an existing ADR', () => {
  const d = repo('owns-docs');
  let r = hook('owns-guard', d, write(join(d, 'docs/decisions/ADR-0003-new.md')));
  expect(r.code === 0 && !r.err, 'expected a new ADR file to be allowed', r);
  r = hook('owns-guard', d, edit(join(d, 'docs/decisions/OPEN.md')));
  expect(r.code === 0 && !r.err, 'expected OPEN.md to be editable', r);
  r = hook('owns-guard', d, write(join(d, 'docs/intents/INT-002-x.md')));
  expect(r.code === 0 && !r.err, 'expected a new intent to be allowed', r);
  r = hook('owns-guard', d, edit(join(d, 'docs/decisions/ADR-0002-x.md'), 'y'));
  expect(r.code === 0 && denied(r) && /ADR-0002-x\.md exists and is not ST-019's to edit/.test(r.out) && /ADR-0007/.test(r.out), 'expected an existing Proposed ADR of another story to be blocked', r);
  r = hook('owns-guard', d, edit(join(d, 'docs/reviews/2026-01-01-x.md')));
  expect(r.code === 0, 'expected review snapshots to stay allowed', r);
});

test('T-HOOK-8 adr-guard: the "Enforced by" line of an Accepted ADR is editable, the body is not', () => {
  const d = repo('adr-enforced');
  writeFileSync(join(d, 'docs/decisions/ADR-0001-x.md'), '# ADR-0001\n\n- **Status:** Accepted\n- **Date:** 2026-01-01\n- **Enforced by:** none yet — prose only\n\n## Decision\n\nx\n');
  let r = hook('adr-guard', d, edit(join(d, 'docs/decisions/ADR-0001-x.md'), '- **Enforced by:** none yet — prose only'));
  expect(r.code === 0 && !r.err, 'expected the Enforced by line to be editable', r);
  r = hook('adr-guard', d, edit(join(d, 'docs/decisions/ADR-0001-x.md'), '## Decision\n\nx'));
  expect(r.code === 0 && denied(r), 'expected the body still blocked', r);
});

test('T-HOOK-5 fix-guard: test files frozen only when LOOPS_FIX_TASK=1', () => {
  const d = repo('fix');
  let r = hook('fix-guard', d, edit(join(d, 'apps/web/src/y.test.tsx')), { LOOPS_FIX_TASK: '1' });
  expect(r.code === 0 && denied(r) && /Fix the code, not the test/.test(r.out), 'expected a JSON deny during a fix task', r);
  r = hook('fix-guard', d, edit(join(d, 'apps/web/src/y.tsx')), { LOOPS_FIX_TASK: '1' });
  expect(r.code === 0 && !denied(r), 'expected source files to stay editable', r);
  r = hook('fix-guard', d, edit(join(d, 'test/run.mjs')), { LOOPS_FIX_TASK: '1' });
  expect(r.code === 0 && denied(r), 'expected a test/ directory file to be frozen', r);
  r = hook('fix-guard', d, edit(join(d, 'apps/web/src/y.test.tsx')));
  expect(r.code === 0 && !denied(r), 'expected no effect outside a fix task', r);
});

test('T-HOOK-6 every hook: empty or malformed stdin never blocks (no JSON deny), and each run stays under 300 ms', () => {
  const d = repo('robust');
  for (const h of ['owns-guard', 'stage-guard', 'generated-guard', 'adr-guard', 'fix-guard']) {
    let r = hook(h, d, null);
    expect(r.code === 0 && !denied(r), `${h}: expected allow on empty stdin`, r);
    r = spawnSync(process.execPath, [join(HOOKS, `${h}.mjs`)], { cwd: d, encoding: 'utf8', input: '{not json' });
    expect(r.status === 0, `${h}: expected allow on malformed stdin`, { code: r.status, out: r.stdout, err: r.stderr });
    const timed = hook(h, d, edit(join(d, 'apps/web/src/y.tsx')));
    expect(timed.ms < 300, `${h}: ${timed.ms.toFixed(0)} ms, expected under 300 ms (node start-up included)`, timed);
  }
});

test('T-HOOK-9 stage-guard: git add -A is allowed on main and outside any repo, blocked on a story branch', () => {
  const onMain = repo('stage-main', { branch: null });
  const r1 = hook('stage-guard', onMain, bash('git add -A'));
  expect(r1.code === 0 && !denied(r1), 'expected no block on main', r1);
  const outside = mkdtempSync(join(tmpdir(), 'loops-nogit-'));
  const r2 = hook('stage-guard', outside, bash('git add -A && git commit -am x'));
  expect(r2.code === 0 && !denied(r2), 'expected no block outside any repo', r2);
  const onStory = repo('stage-story');
  const r3 = hook('stage-guard', onStory, bash('git add -A'));
  expect(r3.code === 0 && denied(r3), 'expected a block on a story branch', r3);
});

test('T-HOOK-10 stage-guard: judged by the directory the command targets and through a rebase', () => {
  const d = repo('stage-target', { branch: null });
  git(d, 'worktree', 'add', '-q', '.worktrees/st-019', '-b', 'story/ST-019-x');
  for (const c of ['git -C .worktrees/st-019 add -A', 'cd .worktrees/st-019 && git add -A', 'cd ".worktrees/st-019"; git commit -am x']) {
    const r = hook('stage-guard', d, bash(c));
    expect(r.code === 0 && denied(r), `expected a block from main for: ${c}`, r);
  }
  const plain = hook('stage-guard', d, bash('git add -A'));
  expect(!denied(plain), 'expected main itself still unguarded', plain);
  // A rebase on a story branch detaches HEAD; the branch is in rebase-merge/head-name.
  const s = repo('stage-rebase');
  const sha = git(s, 'rev-parse', 'HEAD').trim();
  writeFileSync(join(s, '.git/HEAD'), `${sha}\n`);
  mkdirSync(join(s, '.git/rebase-merge'), { recursive: true });
  writeFileSync(join(s, '.git/rebase-merge/head-name'), 'refs/heads/story/ST-019-x\n');
  const r = hook('stage-guard', s, bash('git add -A'));
  expect(r.code === 0 && denied(r), 'expected a block while a story branch is being rebased', r);
});

const only = process.argv[2];
let failed = 0;
for (const c of cases) {
  if (only && !c.name.includes(only)) continue;
  try { c.fn(); console.log(`ok   ${c.name}`); }
  catch (e) { failed++; console.log(`FAIL ${c.name}\n     ${e.message.split('\n').join('\n     ')}`); }
}
console.log(failed ? `\n${failed} case(s) failed` : '\nall hook cases passed');
process.exit(failed ? 1 : 0);
