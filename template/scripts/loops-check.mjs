#!/usr/bin/env node
// loops doc-contract check. Run from the repo root: `node scripts/loops-check.mjs`.
// Output is English regardless of the docs language: it is a log, read next to other tool output.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  loadStories, loadOpens, evaluate, ownershipConflicts, waitingOnActive, loadClaims, isActive, generate,
  loadIntents, loadSpecs, loadAdrs, traceIds, fetchAgeDays,
  STATUSES, CLASSES, OPEN_FILE, STORY_DIR, BACKLOG_FILE, MATRIX_FILE, INTENT_DIR, SPEC_DIR,
  INTENT_STATUSES, SPEC_STATUSES, ADR_STATUSES,
} from './loops-gen.mjs';
import { readManifest, blocksOf, sha256, BASE_DIR, STAGE_DIR } from './loops-update.mjs';

// Blocker messages are stored as "vi / en"; the check prints the English half.
const en = (b) => b.msg.split(' / ')[1] ?? b.msg;

const failures = [];
const notes = [];
const read = (p) => readFileSync(p, 'utf8');

// Story packets are contracts, not logs. Acceptance evidence goes to the PR / docs/reviews (L22).
const STORY_LINE_BUDGET = 250;

// 1. Required harness files exist.
const required = [
  'AGENTS.md',
  'CLAUDE.md',
  'docs/LOOP.md',
  'docs/FEATURE_INTAKE.md',
  'docs/TEST_MATRIX.md',
  'docs/README.md',
  'docs/ARCHITECTURE.md',
  'docs/decisions/README.md',
  'docs/stories/README.md',
  'docs/reviews/README.md',
];
for (const f of required) if (!existsSync(f)) failures.push(`missing required file: ${f}`);
const present = required.filter((f) => existsSync(f));

// 2. No generator artifacts left behind.
for (const f of present) {
  const text = read(f);
  if (text.includes('{{')) failures.push(`${f}: leftover {{slot}}`);
  if (text.includes('loops-init:')) failures.push(`${f}: leftover loops:init comment`);
}

// 3. Load-bearing convention text must stay in place.
const phrases = [
  ['docs/TEST_MATRIX.md', ['Quy ước cell trạng thái', 'Status cell convention']],
  ['docs/LOOP.md', ['không tombstone', 'no tombstones']],
  ['docs/LOOP.md', ['LOOPS:BEGIN core']],
  ['AGENTS.md', ['LOOPS:BEGIN guardrails']],
];
for (const [f, alts] of phrases) {
  if (existsSync(f) && !alts.some((a) => read(f).includes(a)))
    failures.push(`${f}: required convention text missing ("${alts[0]}")`);
}

// 4. Entrypoint size budget — every lesson wants to become a bullet; resist.
if (existsSync('AGENTS.md')) {
  const lines = read('AGENTS.md').split('\n').length;
  if (lines > 120) failures.push(`AGENTS.md: ${lines} lines > 120 budget — move detail into docs/`);
}

// 5. Every ADR referenced from AGENTS.md has a real file.
const adrFiles = existsSync('docs/decisions') ? readdirSync('docs/decisions') : [];
const adrExists = (id) => adrFiles.some((f) => f.startsWith(`ADR-${id}`));
if (existsSync('AGENTS.md') && existsSync('docs/decisions')) {
  const agents = read('AGENTS.md');
  const ids = new Set([...agents.matchAll(/ADR-(\d{4})/g)].map((m) => m[1]));
  for (const id of ids) {
    if (!adrExists(id))
      failures.push(`AGENTS.md references ADR-${id} but docs/decisions/ADR-${id}-*.md does not exist`);
  }
  // 5b. A boundary's ADR says what enforces it (ADR-0006). A note, not a failure (OPEN-003): the rule
  //     still holds as prose, and a consumer must not turn red on the version bump.
  //     A boundary is a line ending in "→ ADR-nnnn" (template/AGENTS.md convention); "Source: ADR-0001"
  //     under Stack is a citation, not a boundary. The section heading is not used: it belongs to the
  //     repo and may be in its own language. No arrow line at all → every reference counts.
  const arrowIds = new Set([...agents.matchAll(/→\s*ADR-(\d{4})/g)].map((m) => m[1]));
  const boundaryIds = arrowIds.size ? arrowIds : ids;
  const adrMeta = loadAdrs('.');
  for (const id of boundaryIds) {
    const a = adrMeta.get(`ADR-${id}`);
    if (a && !a.enforcedBy)
      notes.push(`ADR-${id} backs an AGENTS.md boundary but has no "- **Enforced by:**" line — the boundary holds only as prose until /loops:encode adds a check (see docs/templates/decision.md)`);
  }
}

// 6. TEST_MATRIX status cells obey the convention: emoji + optional pointer, nothing else.
if (existsSync('docs/TEST_MATRIX.md')) {
  const cell = /\|\s*(☐|🟡|✅)(\s*→?\s*ST-\d+)?\s*\|\s*$/u;
  for (const [i, line] of read('docs/TEST_MATRIX.md').split('\n').entries()) {
    if (/^\|\s*T-/.test(line) && !cell.test(line))
      failures.push(`docs/TEST_MATRIX.md:${i + 1}: status cell breaks the convention (emoji + optional "→ ST-xxx" only)`);
  }
}

// 7. Story front matter — the machine-readable layer that makes parallel work safe.
//    Legacy mode: a repo whose stories all predate front matter passes with a notice; the moment one
//    story carries front matter, every story must (mixing the two is how the tables drift again).
let stories = [];
try {
  stories = loadStories('.');
} catch (e) {
  failures.push(e.message);
}
const modern = stories.filter((s) => !s.legacy);
const legacy = stories.filter((s) => s.legacy);
if (stories.length && modern.length === 0) {
  notes.push(`stories: ${legacy.length} packet(s) without front matter — legacy mode, parallel-work checks skipped`);
} else if (modern.length) {
  for (const s of legacy) failures.push(`${s.file}: missing front matter while other stories have it — add the block (see docs/templates/story.md)`);

  const opens = loadOpens('.');
  if (opens === null && modern.some((s) => s.opens.length))
    failures.push(`${OPEN_FILE} missing but stories list opens — create it from the template`);
  const intents = loadIntents('.');
  const specs = loadSpecs('.');
  const adrs = loadAdrs('.');
  evaluate(modern, opens ?? new Map(), '.', { specs, adrs });

  const seen = new Map();
  for (const s of modern) {
    const idFromName = s.file.match(/(ST-\d+)/)[1];
    if (s.id !== idFromName) failures.push(`${s.file}: front matter id "${s.id}" does not match the file name (${idFromName})`);
    if (seen.has(s.id)) failures.push(`${s.file}: duplicate story id ${s.id} (also ${seen.get(s.id)})`);
    seen.set(s.id, s.file);
    if (!s.title) failures.push(`${s.file}: front matter needs "title"`);
    if (!CLASSES.includes(s.class)) failures.push(`${s.file}: "class" must be one of ${CLASSES.join(' | ')} (got "${s.class}")`);
    if (!STATUSES.includes(s.status)) failures.push(`${s.file}: "status" must be one of ${STATUSES.join(' | ')} (got "${s.status}")`);
    // Budget applies to packets a session may still load (/loops:start reads active stories only); done packets are history.
    if (s.status !== 'done' && s.lines > STORY_LINE_BUDGET)
      failures.push(`${s.file}: ${s.lines} lines > ${STORY_LINE_BUDGET} budget — the packet is a contract; move acceptance logs to the PR / docs/reviews`);
    for (const a of s.adrs) {
      const m = a.match(/^ADR-(\d{4})$/);
      if (!m || !adrExists(m[1])) failures.push(`${s.file}: adrs references ${a} but no such ADR file exists`);
    }
    // A Proposed ADR on a normal story is a note (the gate is for high-risk, see evaluate()).
    for (const n of s.adrNotes ?? []) notes.push(`${s.file}: ${en({ msg: n })} — settle it before the story starts, or move the decision out of adrs`);
    for (const id of traceIds(s.trace)) {
      if (id.startsWith('INT-') && !intents.has(id)) failures.push(`${s.file}: trace names ${id} but ${INTENT_DIR}/${id}-*.md does not exist`);
      if (id.startsWith('SPEC-') && !specs.has(id)) failures.push(`${s.file}: trace names ${id} but ${SPEC_DIR}/${id}-*.md does not exist`);
    }
    for (const dep of s.depends_on) if (dep === s.id) failures.push(`${s.file}: depends_on itself`);
    for (const o of s.opens) if (!/^OPEN-\d+$/.test(o)) failures.push(`${s.file}: opens entry "${o}" must look like OPEN-001`);
    for (const g of s.owns) if (g.startsWith('/') || g.includes('..')) failures.push(`${s.file}: owns glob "${g}" must be repo-relative`);

    // Ready / In-progress are machine-checkable states, not moods.
    if (s.status === 'ready' && !s.machineReady)
      failures.push(`${s.file}: status "ready" but blocked — ${s.blockers.map(en).join('; ')}`);
    if (s.status === 'in-progress' && s.hardBlockers.length)
      failures.push(`${s.file}: status "in-progress" but blocked — ${s.hardBlockers.map(en).join('; ')} (an open OPEN is allowed mid-flight; these are not)`);
    // A consumed file that exists only in this working tree may never reach main.
    if ((s.status === 'ready' || s.status === 'in-progress') && s.consumesOffMain.length)
      failures.push(`${s.file}: consumes ${s.consumesOffMain.join(', ')} exists here but is not on main yet — wait for the producing story to land`);
    if (s.status === 'in-progress' && s.owns.length === 0)
      failures.push(`${s.file}: in-progress without "owns" — declare the paths this story may edit so parallel sessions cannot collide`);
    if (s.status === 'done' && s.proof.some((p) => p.status && p.status !== '✅'))
      failures.push(`${s.file}: status done but a proof row is not ✅`);
    if (s.status === 'done' && s.opens.length)
      failures.push(`${s.file}: status done but still lists opens`);
  }

  // Closed OPENs must leave the story's list — the queue is a hand-off, not an archive.
  if (opens) {
    for (const s of modern)
      for (const o of s.opens) {
        const rec = opens.get(o);
        if (rec && rec.status === 'closed') failures.push(`${s.file}: ${o} is closed in ${OPEN_FILE} — remove it from opens (and record the decision where the row says)`);
      }
    for (const [id, rec] of opens) {
      if (!['open', 'closed'].includes(rec.status)) failures.push(`${OPEN_FILE}: ${id} status must be "open" or "closed" (got "${rec.status}")`);
      if (rec.status === 'closed' && !rec.recordedAt) failures.push(`${OPEN_FILE}: ${id} is closed but does not say where the decision was recorded`);
    }
  }

  // Two active stories editing the same paths is the clobber class (L21). "Active" includes stories
  // claimed by an unmerged story/* branch: their in-progress status lives on that branch, not here.
  const claims = loadClaims('.');
  for (const c of ownershipConflicts(modern, claims))
    failures.push(`${c.a} and ${c.b} are both active and their owns overlap: "${c.ga}" vs "${c.gb}" — narrow one glob or serialize the stories`);
  for (const c of waitingOnActive(modern, claims))
    notes.push(`${c.a} and ${c.b}: owns overlap ("${c.ga}" vs "${c.gb}") and one of them is active — the ready one cannot start until the other lands`);
  for (const [id, branches] of claims)
    if (!modern.some((s) => s.id === id)) notes.push(`branch ${branches.join(', ')} claims ${id}, but no story file has that id`);

  // Proof ids are unique across stories.
  const proofOwner = new Map();
  for (const s of modern)
    for (const p of s.proof) {
      if (proofOwner.has(p.id)) failures.push(`${s.file}: proof ${p.id} already owned by ${proofOwner.get(p.id)}`);
      else proofOwner.set(p.id, s.id);
    }

  // A merge of two story branches conflicts inside the generated blocks (both regenerated them).
  // The fix is never a hand edit: resolve the story files, then regenerate.
  for (const f of [BACKLOG_FILE, MATRIX_FILE]) {
    if (existsSync(f) && /^(<{7}|>{7}) /m.test(read(f)))
      failures.push(`${f}: merge conflict markers — resolve the conflicts in docs/stories/ST-*.md first, then run "node scripts/loops-gen.mjs" (never resolve a generated block by hand)`);
  }

  // Generated tables must match the stories they are derived from.
  try {
    const r = generate('.', { check: true });
    for (const f of r.stale) failures.push(`${f}: generated block is stale — run "node scripts/loops-gen.mjs" (never edit the block by hand)`);
  } catch (e) {
    failures.push(e.message);
  }
}

// 12. Intents and specs (Plan and Design stages): front matter valid, the chain story -> spec -> intent
//     resolves, and "accepted" means every point a person had to decide is resolved.
{
  const intents = loadIntents('.');
  const specs = loadSpecs('.');
  const adrs = loadAdrs('.');
  const opens = loadOpens('.') ?? new Map();
  for (const it of intents.values()) {
    if (!it.hasFrontMatter) { failures.push(`${it.file}: missing front matter (see docs/templates/intent.md)`); continue; }
    if (it.id !== it.idFromName) failures.push(`${it.file}: front matter id "${it.id}" does not match the file name (${it.idFromName})`);
    if (!INTENT_STATUSES.includes(it.status)) failures.push(`${it.file}: "status" must be one of ${INTENT_STATUSES.join(' | ')} (got "${it.status}")`);
    for (const sp of it.spec) if (!specs.has(sp)) failures.push(`${it.file}: spec lists ${sp} but no such file in ${SPEC_DIR}`);
  }
  for (const sp of specs.values()) {
    if (!sp.hasFrontMatter) { failures.push(`${sp.file}: missing front matter (see docs/templates/spec.md)`); continue; }
    if (sp.id !== sp.idFromName) failures.push(`${sp.file}: front matter id "${sp.id}" does not match the file name (${sp.idFromName})`);
    if (!SPEC_STATUSES.includes(sp.status)) failures.push(`${sp.file}: "status" must be one of ${SPEC_STATUSES.join(' | ')} (got "${sp.status}")`);
    if (sp.intent && !intents.has(sp.intent)) failures.push(`${sp.file}: intent ${sp.intent} has no file in ${INTENT_DIR}`);
    else if (sp.intent && intents.get(sp.intent).status !== 'accepted') notes.push(`${sp.file}: its intent ${sp.intent} is "${intents.get(sp.intent).status}", not accepted`);
    for (const a of sp.adrs) if (!adrs.has(a)) failures.push(`${sp.file}: adrs references ${a} but no such ADR file exists`);
    if (sp.status === 'accepted') {
      const stillOpen = sp.opens.filter((o) => !opens.has(o) || opens.get(o).status !== 'closed');
      if (stillOpen.length) failures.push(`${sp.file}: status "accepted" but opens still unresolved: ${stillOpen.join(', ')} — an accepted spec has no point left for a person to decide`);
      const proposed = sp.adrs.filter((a) => adrs.has(a) && adrs.get(a).status !== 'Accepted' && adrs.get(a).status !== 'Superseded');
      if (proposed.length) failures.push(`${sp.file}: status "accepted" but ADR(s) not Accepted: ${proposed.join(', ')}`);
    }
  }
  for (const a of adrs.values())
    if (!a.status) notes.push(`${a.file}: no "- **Status:**" line — treated as Proposed, which blocks every high-risk story that inherits it`);
    else if (!ADR_STATUSES.includes(a.status)) failures.push(`${a.file}: Status "${a.status}" must be one of ${ADR_STATUSES.join(' | ')}`);
}

// 13. The deterministic layer is wired (ADR-0004): .claude/settings.json names the PreToolUse hooks
//     and every script it points at exists. A hook nobody runs does not exist (L26, applied to hooks).
{
  const SETTINGS = '.claude/settings.json';
  if (!existsSync(SETTINGS)) {
    notes.push(`${SETTINGS} missing — no PreToolUse hook is wired, so owns / staging / generated-table / ADR rules hold only as prose; run /loops:update to install the hooks`);
  } else {
    let cfg = null;
    try { cfg = JSON.parse(read(SETTINGS)); } catch (e) { failures.push(`${SETTINGS}: not valid JSON (${e.message})`); }
    const pre = cfg?.hooks?.PreToolUse;
    if (cfg && !Array.isArray(pre)) notes.push(`${SETTINGS} has no hooks.PreToolUse block — the boundaries hold only as prose`);
    const seen = [];
    for (const entry of Array.isArray(pre) ? pre : []) {
      for (const h of entry?.hooks ?? []) {
        const command = String(h?.command ?? '');
        // On Windows, Claude Code runs hook commands under PowerShell, where "$CLAUDE_PROJECT_DIR" is an
        // undefined variable ($null): the path becomes "/.claude/hooks/x.mjs", node fails with status 1,
        // and a failed hook never blocks (observed 2026-10-06, Claude Code 2.1.290). "${CLAUDE_PROJECT_DIR}"
        // expands in bash and PowerShell alike.
        if (/\$CLAUDE_PROJECT_DIR\b/.test(command) && !/\$\{CLAUDE_PROJECT_DIR\}/.test(command))
          failures.push(`${SETTINGS}: hook command "${command.slice(0, 60)}" uses $CLAUDE_PROJECT_DIR without braces — under PowerShell (Windows) that is $null and the hook never runs; write \${CLAUDE_PROJECT_DIR}`);
        const m = command.match(/\.claude\/hooks\/([\w.-]+\.mjs)/);
        if (!m) continue;
        seen.push(m[1]);
        if (!existsSync(`.claude/hooks/${m[1]}`)) failures.push(`${SETTINGS} runs .claude/hooks/${m[1]} but the file does not exist — the gate is declared and never runs`);
      }
    }
    const EXPECTED = ['owns-guard.mjs', 'stage-guard.mjs', 'generated-guard.mjs', 'adr-guard.mjs', 'fix-guard.mjs'];
    const missing = EXPECTED.filter((f) => !seen.includes(f));
    if (cfg && Array.isArray(pre) && missing.length) notes.push(`${SETTINGS}: loops hooks not wired: ${missing.join(', ')} — the matching rule holds only as prose until /loops:update installs them`);
    if (seen.length) notes.push(`hooks wired: ${seen.join(', ')}`);
  }
}

// 8. No orphan story ids in TEST_MATRIX pointers.
if (existsSync('docs/TEST_MATRIX.md') && existsSync(STORY_DIR)) {
  const files = readdirSync(STORY_DIR);
  for (const m of read('docs/TEST_MATRIX.md').matchAll(/→\s*(ST-\d+)/g))
    if (!files.some((f) => f.startsWith(m[1]))) failures.push(`docs/TEST_MATRIX.md points to ${m[1]} but no such story file exists`);
}

// 8b. A ✅ proof row should be backed by a test that names it (LESSONS.md L36). The ✅ is typed by
//     whoever closed the story; without this, "done" only proves the marks agree with each other.
//     A note, not a failure: repos that predate the convention would turn red on upgrade, and a
//     test title is a convention, not proof that the test asserts the right thing.
{
  // Tracked plus untracked-but-not-ignored: a test written in this session counts before it is committed.
  const tracked = (() => {
    try {
      const ls = (args) => execSync(`git ls-files ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean);
      return [...ls(''), ...ls('--others --exclude-standard')];
    } catch {
      return null;
    }
  })();
  if (tracked) {
    const isTest = (f) => /(^|\/)(tests?|__tests__|e2e|spec)\//.test(f) || /[._-](test|spec)\.[a-z0-9]+$/i.test(f);
    const testText = tracked.filter(isTest).map((f) => {
      try { return read(f); } catch { return ''; }
    }).join('\n');
    const missing = [];
    for (const s of stories.filter((x) => !x.legacy))
      for (const p of s.proof)
        if (p.status === '✅' && !/manual/i.test(p.kind) && !testText.includes(p.id)) missing.push(p.id);
    if (missing.length)
      notes.push(
        `${missing.length} proof row(s) marked ✅ with no test file naming the id: ${missing.slice(0, 12).join(', ')}` +
          `${missing.length > 12 ? `, …+${missing.length - 12}` : ''} — put the id in the test title so a reviewer can find the test`,
      );
  }
}

// 9. This gate names its invoker (LOOP.md maintenance rule 8, LESSONS.md L26, L35).
//    A check nobody runs is not a gate. Only something that actually runs on push or in CI counts:
//    a package.json script or a make target is an alias (a shorter way to type the command), a
//    .githooks/ file runs only when core.hooksPath points at it, and a comment runs nothing.
{
  const INVOKER_FILES = [
    'lefthook.yml', 'lefthook.yaml', '.lefthook.yml', '.lefthook.yaml',
    '.pre-commit-config.yaml', '.gitlab-ci.yml', 'azure-pipelines.yml', 'Jenkinsfile',
  ];
  const INVOKER_DIRS = ['.husky', '.githooks', '.github/workflows', '.circleci'];
  const ALIAS_FILES = ['Makefile', 'justfile', 'Justfile', 'Taskfile.yml'];
  const calls = /loops[-:]check/;
  // Comment lines are dropped before searching: "# TODO: run loops-check" is not a call.
  const callsIt = (f) => {
    try {
      return read(f).split('\n').some((l) => !/^\s*(#|\/\/|;|--|REM\b)/i.test(l) && calls.test(l));
    } catch {
      return false;
    }
  };
  const filesIn = (d) => {
    try {
      return readdirSync(d, { withFileTypes: true }).filter((f) => f.isFile()).map((f) => `${d}/${f.name}`);
    } catch {
      return [];
    }
  };

  let hooksPath = null;
  try {
    hooksPath = execSync('git config --get core.hooksPath', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    // unset (or no git): git uses .git/hooks, so .githooks/ is not run
  }
  const norm = (p) => (p ?? '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');

  const invokers = [];
  for (const f of INVOKER_FILES) if (existsSync(f) && callsIt(f)) invokers.push(f);
  for (const d of INVOKER_DIRS) {
    const hits = existsSync(d) ? filesIn(d).filter(callsIt) : [];
    if (!hits.length) continue;
    if (d === '.githooks' && norm(hooksPath) !== '.githooks') {
      notes.push(`${hits.join(', ')} calls loops-check, but git does not run it: core.hooksPath is ${hooksPath ? `"${hooksPath}"` : 'not set'} — run "git config core.hooksPath .githooks" in each clone`);
      continue;
    }
    if (d === '.githooks') {
      // git on macOS/Linux skips a hook without the executable bit; on Windows it runs whatever the mode,
      // so there only the committed mode tells whether other clones will run it. .husky/ is not checked:
      // husky runs its files through sh.
      for (const f of hits) {
        if (process.platform !== 'win32' && !(statSync(f).mode & 0o111)) {
          notes.push(`${f} calls loops-check, but git does not run it: the file is not executable — run "chmod +x ${f} && git update-index --chmod=+x ${f}" and commit`);
          continue;
        }
        let mode = '';
        try {
          mode = execSync(`git ls-files -s -- "${f}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split(/\s/)[0];
        } catch {
          // no git: nothing committed to compare
        }
        if (mode === '100644')
          notes.push(`${f} is committed without the executable bit (mode 100644): clones on macOS/Linux will not run it — run "git update-index --chmod=+x ${f}" and commit`);
        invokers.push(f);
      }
      continue;
    }
    invokers.push(...hits);
  }
  const aliases = ALIAS_FILES.filter((f) => existsSync(f) && callsIt(f));
  if (aliases.length)
    notes.push(`${aliases.join(', ')} mentions loops-check; a make/just/task target is an alias, so it counts only when a hook or CI job calls that target`);

  const ciSystems = [
    existsSync('.gitlab-ci.yml') && '.gitlab-ci.yml',
    existsSync('.github/workflows') && filesIn('.github/workflows').length && '.github/workflows/',
    existsSync('azure-pipelines.yml') && 'azure-pipelines.yml',
    existsSync('.circleci') && '.circleci/',
    existsSync('Jenkinsfile') && 'Jenkinsfile',
  ].filter(Boolean);
  if (ciSystems.length > 1)
    notes.push(`two CI systems are configured (${ciSystems.join(', ')}) — a remote reads only one of them; make sure that one runs loops-check`);

  if (invokers.length === 0)
    failures.push(
      'loops-check has no invoker — a gate nobody runs does not exist (LOOP.md rule 8). ' +
        'Call it from a git hook or a CI job the remote actually reads. Dependency-free option: ' +
        'create .githooks/pre-push running "node scripts/loops-check.mjs", then ' +
        '"git config core.hooksPath .githooks". A package.json script or make target alone does not count — it is an alias, not an invoker.',
    );
  // Four enforcement levels, each claimed only with its own evidence (ADR-0006): this item sees the
  // declaration, nothing more. Whether the remote ran the job on this revision, or requires it to
  // merge, cannot be read from the repo.
  else notes.push(`declared in: ${invokers.join(', ')} — a declaration in the repo is not proof the job ran on this revision; branch protection is unverified from here`);
}

// 10. Time signals (LESSONS.md L28). Everything above is structural: it reads the repo as a
//     snapshot and cannot see something going stale. Two things rot on a clock rather than on a
//     diff — a question waiting on a human, and a repo drifting away from its last review.
//     These are NOTES, never failures: a push must not be blocked because a person is slow.
{
  const OPEN_STALE_DAYS = 30;
  const REVIEW_DEBT_DAYS = 45;
  const today = new Date();
  const daysSince = (iso) => {
    const t = Date.parse(`${iso}T00:00:00Z`);
    return Number.isNaN(t) ? null : Math.floor((today.getTime() - t) / 86_400_000);
  };

  const opens = loadOpens('.');
  if (opens) {
    const stale = [];
    let undated = 0;
    for (const rec of opens.values()) {
      if (rec.status !== 'open') continue;
      if (!rec.opened) { undated++; continue; }
      const age = daysSince(rec.opened);
      if (age !== null && age > OPEN_STALE_DAYS) stale.push(`${rec.id} (${age}d)`);
    }
    if (stale.length)
      notes.push(`OPEN rows waiting over ${OPEN_STALE_DAYS} days: ${stale.join(', ')} — the queue is blocking work nobody is unblocking`);
    if (undated)
      notes.push(`${undated} open OPEN row(s) have no "opened" date — add the column so their age is visible (see docs/templates or the harness OPEN.md)`);
  }

  if (existsSync('docs/reviews')) {
    const dates = readdirSync('docs/reviews')
      .map((f) => f.match(/^(\d{4}-\d{2}-\d{2})-.*\.md$/)?.[1])
      .filter(Boolean)
      .sort();
    const newest = dates[dates.length - 1];
    const done = stories.filter((s) => !s.legacy && s.status === 'done').length;
    if (!newest && done >= 5)
      notes.push(`${done} stories done and no review snapshot in docs/reviews/ — every ✅ in this repo is self-attested`);
    else if (newest) {
      const age = daysSince(newest);
      if (age !== null && age > REVIEW_DEBT_DAYS)
        notes.push(`last review snapshot is ${age} days old (${newest}), ${done} stories done — run /loops:review before the next milestone`);
    }
  }
}

// 11. What this session actually changed vs what its story claims to own (LESSONS.md L32).
//     Section 7 compares the owns of active stories with EACH OTHER, which catches two sessions
//     editing the same paths but never compares owns with the real diff: a story can edit a file it
//     never declared and every check stays green, until a second session runs. A note, not a
//     failure: some repo-wide files belong to no story (lockfiles, root config), and a failure in
//     the wrong place gets worked around instead of fixed.
{
  const git = (args) => {
    try {
      return execSync(`git ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      return null; // no git, not a repo, or no upstream — this check simply does not apply
    }
  };

  const claimed = loadClaims('.');
  const active = (stories ?? []).filter((s) => !s.legacy && (s.status === 'ready' || isActive(s, claimed)));
  if (active.length) {
    const changed = new Set();
    for (const f of git('diff --name-only HEAD') ?? []) changed.add(f);
    for (const f of git('ls-files --others --exclude-standard') ?? []) changed.add(f);
    // Work already committed but not yet pushed is the pre-push case — the moment this matters most.
    const upstream = git('rev-parse --abbrev-ref --symbolic-full-name @{u}');
    if (upstream?.length) for (const f of git(`diff --name-only ${upstream}...HEAD`) ?? []) changed.add(f);

    // Files no story owns by design: the harness's own hand-off surfaces, and dependency lockfiles.
    const exempt = [/^docs\/stories\//, /^docs\/TEST_MATRIX\.md$/, /^docs\/decisions\//, /^(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/];
    // "apps/web/**" owns apps/web/x but not apps/website/x; "apps/web*" (a partial segment) owns both.
    const ownsPath = (g, f) => {
      if (!g.includes('*')) return f === g || f.startsWith(`${g.replace(/\/+$/, '')}/`);
      return f.startsWith(g.split('*')[0]); // "apps/web/" for apps/web/**, "apps/web" for apps/web*
    };
    const owned = (f) => active.some((s) => s.owns.some((g) => ownsPath(g, f)));

    const stray = [...changed].filter((f) => !exempt.some((r) => r.test(f)) && !owned(f)).sort();
    if (stray.length) {
      const shown = stray.slice(0, 12);
      notes.push(
        `${stray.length} changed path(s) outside the "owns" of every active story (${active.map((s) => s.id).join(', ')}): ` +
          `${shown.join(', ')}${stray.length > shown.length ? `, …+${stray.length - shown.length}` : ''} — ` +
          'add the glob to the story that did the work, or move the change under the story that already owns it',
      );
    }
  }
}

// 16. Where story worktrees live (docs/reviews/2026-10-15-improve-worktree-location.md). /loops:start
//     puts them at .worktrees/<st-id> inside the repo: a sibling directory outlives `git worktree
//     remove` (ignored node_modules stay behind) where nobody looks. Outside .worktrees/ is a note;
//     inside it without a .gitignore entry is a failure — its files would be staged by the next add.
{
  const run = (args, cwd = '.') => {
    try { return { ok: true, out: execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) }; }
    catch { return { ok: false, out: '' }; }
  };
  const list = run('worktree list --porcelain');
  if (list.ok) {
    const norm = (p) => { const s = p.trim().replace(/\\/g, '/').replace(/\/+$/, ''); return process.platform === 'win32' ? s.toLowerCase() : s; };
    const paths = list.out.split('\n').filter((l) => l.startsWith('worktree ')).map((l) => l.slice('worktree '.length).trim());
    const [main, ...linked] = paths;
    if (main) {
      const home = `${norm(main)}/.worktrees/`;
      const outside = linked.filter((p) => !norm(p).startsWith(home));
      if (outside.length)
        notes.push(`${outside.length} worktree(s) outside .worktrees/: ${outside.join(', ')} — /loops:start puts a story at .worktrees/<st-id>; after the merge run "git worktree remove <path>" and delete the leftover directory`);
      if (linked.length > outside.length && !run('check-ignore -q .worktrees/x', main).ok)
        failures.push('.worktrees/ holds a worktree but is not in .gitignore — add the line ".worktrees/" so its files are never staged into the main checkout');
    }
  }
}

// 15. Several developers (ADR-0007). Ids are allocated per clone, so a duplicate can only be caught
//     here, after the merge: two files with one id, or one OPEN id twice, is a failure naming both.
//     And the refs this check reads are only as fresh as the last fetch: a stale one is a note.
{
  for (const [kind, dir] of [['INT', INTENT_DIR], ['SPEC', SPEC_DIR], ['ADR', 'docs/decisions'], ['ST', STORY_DIR]]) {
    if (!existsSync(dir)) continue;
    const byId = new Map();
    for (const f of readdirSync(dir)) {
      const m = f.match(new RegExp(`^(${kind}-\\d+)`));
      if (!m) continue;
      if (!byId.has(m[1])) byId.set(m[1], []);
      byId.get(m[1]).push(f);
    }
    for (const [id, files] of byId)
      if (files.length > 1) failures.push(`${dir}: ${id} is used by ${files.length} files (${files.join(', ')}) — two branches allocated the same id; renumber the one merged last (loops-gen --next-id ${kind})`);
  }
  if (existsSync(OPEN_FILE)) {
    const seen = new Map();
    for (const [i, line] of read(OPEN_FILE).split('\n').entries()) {
      const m = line.match(/^\|\s*(OPEN-\d+)\s*\|/);
      if (!m) continue;
      if (seen.has(m[1])) failures.push(`${OPEN_FILE}:${i + 1}: ${m[1]} already appears on line ${seen.get(m[1])} — two branches allocated the same id; renumber one row and the story/spec that lists it`);
      else seen.set(m[1], i + 1);
    }
  }
  const remotes = (() => { try { return execSync('git remote', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } })();
  if (remotes) {
    const age = fetchAgeDays('.');
    if (age === null) notes.push('this clone has a remote but no FETCH_HEAD — never fetched here, so other developers\' story branches are invisible; run "git fetch --prune" (loops-gen --claims --fetch does it)');
    else if (age > 1) notes.push(`remote refs last fetched ${Math.floor(age)} day(s) ago — claims and ids from other developers may be missing; run "node scripts/loops-gen.mjs --claims --fetch"`);
  }
}

// 14. The installed base (ADR-0005). A managed file that differs from what was installed is a local
//     fork the next /loops:update will have to merge; a manifest version that disagrees with the
//     LOOP.md stamp means one of the two was edited by hand. Notes: the repo still works.
{
  const manifest = readManifest('.');
  if (manifest) {
    const drift = [];
    for (const [p, rec] of Object.entries(manifest.files)) {
      if (manifest.frozen.includes(p) || !existsSync(p)) continue;
      // Compared as LF, the way loops-update stores and hashes the base: a CRLF checkout is not a fork.
      const lf = (f) => read(f).replace(/\r\n/g, '\n');
      if (rec.kind === 'managed' && sha256(lf(p)) !== rec.sha256) drift.push(p);
      if (rec.kind === 'mixed' && existsSync(`${BASE_DIR}/${p}`)) {
        const lo = blocksOf(lf(p));
        for (const [name, b] of blocksOf(lf(`${BASE_DIR}/${p}`))) if (lo.get(name)?.body !== b.body) drift.push(`${p} (block ${name})`);
      }
    }
    if (drift.length)
      notes.push(`${drift.length} managed file(s) differ from the installed base: ${drift.join(', ')} — a local fork; /loops:update will merge it three-way, or list it in manifest.frozen with an ADR`);
    const stamp = existsSync('docs/LOOP.md') ? read('docs/LOOP.md').match(/loops v(\d+\.\d+\.\d+)/)?.[1] : null;
    if (stamp && manifest.version && stamp !== manifest.version)
      notes.push(`LOOPS_VERSION ${stamp} in docs/LOOP.md but .loops/manifest.json says ${manifest.version} — one of them was edited by hand; the manifest is written by loops-update`);
    if (existsSync(STAGE_DIR))
      notes.push(`${STAGE_DIR}/ exists: an update is half done — resolve resolved/* then "node scripts/loops-update.mjs --continue", or --abort`);
  }
}

for (const n of notes) console.log(`loops-check: note — ${n}`);
if (failures.length) {
  console.error(`loops-check: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('loops-check: OK');
