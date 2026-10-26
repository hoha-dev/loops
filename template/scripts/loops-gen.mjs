#!/usr/bin/env node
// loops generator: story front matter -> backlog table + TEST_MATRIX rows.
// Run from the repo root:
//   node scripts/loops-gen.mjs          rewrite the generated blocks in place
//   node scripts/loops-gen.mjs --check  exit 1 if any generated block is stale (CI / loops-check)
//   node scripts/loops-gen.mjs --claims list stories claimed by an unmerged story/ST-xxx branch
//
// The generated blocks are delimited by <!-- LOOPS:GEN <name> --> ... <!-- LOOPS:GEN-END <name> -->.
// Nothing outside the markers is touched. Story files are the single source of truth; the tables
// are build artifacts and must never be edited by hand (that is what made parallel sessions clobber
// each other — see the harness LESSONS.md, L21).
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const STORY_DIR = 'docs/stories';
export const BACKLOG_FILE = 'docs/stories/README.md';
export const MATRIX_FILE = 'docs/TEST_MATRIX.md';
export const OPEN_FILE = 'docs/decisions/OPEN.md';
export const INTENT_DIR = 'docs/intents';
export const SPEC_DIR = 'docs/specs';
export const ADR_DIR = 'docs/decisions';
export const INTENT_STATUSES = ['draft', 'accepted', 'closed'];
export const SPEC_STATUSES = ['draft', 'accepted'];
export const ADR_STATUSES = ['Proposed', 'Accepted', 'Superseded'];

export const STATUSES = ['draft', 'ready', 'in-progress', 'done'];
export const CLASSES = ['normal', 'high-risk'];
const STATUS_EMOJI = { draft: '☐', ready: '☐', 'in-progress': '🟡', done: '✅' };
const CLASS_EMOJI = { normal: '🟡', 'high-risk': '🔴' };

// ---------------------------------------------------------------------------
// Front matter (a deliberate YAML subset — no dependency, no surprises):
//   key: scalar
//   key: [a, b, c]        inline list, one line
//   key:                  block list
//     - item
//   key: [                flow list over several lines — what a long `owns` turns into as soon as
//     a,                  a formatter touches it, or as soon as a human wraps it by hand
//   ]
// Scalars are strings. Lists are lists of strings. Anything else is rejected loudly, and the
// message says what shape was expected: a parser this small must not answer a valid-YAML input
// with `cannot parse "  ["`, which reads as a corrupt file rather than an unsupported shape.
// ---------------------------------------------------------------------------
export function parseFrontMatter(text, file = '<memory>') {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) throw new Error(`${file}: front matter opened with --- but never closed`);
  const block = text.slice(3, end).split('\n');
  const data = {};
  let listKey = null;
  let flowKey = null;
  let flowBuf = '';
  const splitInline = (inner) =>
    inner.trim() ? inner.split(',').map((s) => stripQuotes(s.trim())).filter(Boolean) : [];

  for (const [i, raw] of block.entries()) {
    const line = raw.replace(/\s+$/, '');

    if (flowKey !== null) {
      flowBuf += ` ${line.trim()}`;
      if (!line.includes(']')) continue;
      data[flowKey] = splitInline(flowBuf.slice(flowBuf.indexOf('[') + 1, flowBuf.lastIndexOf(']')));
      flowKey = null;
      flowBuf = '';
      continue;
    }

    if (!line.trim() || line.trim().startsWith('#')) continue;

    // `key:` with the bracket on the NEXT line — what prettier produces for a list too long to fit,
    // so it is the shape a long `owns` ends up in without anyone choosing it.
    if (listKey && Array.isArray(data[listKey]) && data[listKey].length === 0 && line.trim().startsWith('[')) {
      flowKey = listKey;
      listKey = null;
      flowBuf = line.trim();
      if (flowBuf.includes(']')) {
        data[flowKey] = splitInline(flowBuf.slice(flowBuf.indexOf('[') + 1, flowBuf.lastIndexOf(']')));
        flowKey = null;
        flowBuf = '';
      }
      continue;
    }

    const item = line.match(/^\s+-\s+(.*)$/);
    if (item) {
      if (!listKey) throw new Error(`${file}: front matter line ${i + 1}: list item without a key`);
      data[listKey].push(stripQuotes(item[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv)
      throw new Error(
        `${file}: front matter line ${i + 1}: cannot parse "${line}" — expected "key: value", "key: [a, b]", or a "  - item" under a key`,
      );
    const [, key, rest] = kv;
    if (rest === '') {
      data[key] = [];
      listKey = key;
    } else if (rest.startsWith('[')) {
      listKey = null;
      if (rest.endsWith(']')) data[key] = splitInline(rest.slice(1, -1));
      else {
        flowKey = key;
        flowBuf = rest;
      }
    } else {
      data[key] = stripQuotes(rest);
      listKey = null;
    }
  }
  if (flowKey !== null) throw new Error(`${file}: front matter "${flowKey}": list opened with [ but never closed`);
  return { data, bodyStart: end + 4 };
}

function stripQuotes(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

// Proof entries: "T-SET-4 | unit | behavior text | ✅" (status optional).
export function parseProof(entry, story) {
  // "\|" inside a cell is a literal pipe (markdown escape), not a separator.
  const parts = entry.split(/(?<!\\)\|/).map((s) => s.trim().replace(/\\\|/g, '|'));
  if (parts.length < 3) throw new Error(`${story.file}: proof "${entry}" must be "T-ID | kind | behavior [| status]"`);
  const [id, kind, behavior, status] = parts;
  if (!/^T-[A-Z0-9]+-\d+$/.test(id)) throw new Error(`${story.file}: proof id "${id}" must look like T-DOM-1`);
  if (status && !['☐', '🟡', '✅'].includes(status))
    throw new Error(`${story.file}: proof "${id}" status must be ☐ / 🟡 / ✅, got "${status}"`);
  return { id, kind, behavior, status: status || null, domain: id.split('-')[1], story: story.id };
}

export function loadStories(root = '.') {
  const dir = join(root, STORY_DIR);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => /^ST-\d+.*\.md$/.test(f)).sort();
  const stories = [];
  for (const f of files) {
    const file = `${STORY_DIR}/${f}`;
    const text = readFileSync(join(root, file), 'utf8');
    const fm = parseFrontMatter(text, file);
    const lines = text.split('\n').length;
    if (!fm) {
      stories.push({ file, id: f.match(/^(ST-\d+)/)[1], legacy: true, lines });
      continue;
    }
    const d = fm.data;
    const story = {
      file,
      lines,
      legacy: false,
      id: d.id,
      title: d.title || '',
      trace: d.trace || '',
      class: d.class,
      status: d.status,
      depends_on: asList(d.depends_on),
      consumes: asList(d.consumes),
      owns: asList(d.owns),
      opens: asList(d.opens),
      adrs: asList(d.adrs),
      proofRaw: asList(d.proof),
    };
    story.proof = story.proofRaw.map((p) => parseProof(p, story));
    stories.push(story);
  }
  return stories;
}

const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// Intents (Plan stage) and specs (Design stage): the two artifacts that come before a story.
// Both carry front matter; a story's `trace:` names the spec (and/or intent) it was split from.
function loadArtifacts(root, dir, prefix) {
  const d = join(root, dir);
  if (!existsSync(d)) return new Map();
  const out = new Map();
  const nameRe = new RegExp(`^${prefix}-\\d+.*\\.md$`);
  const idRe = new RegExp(`^(${prefix}-\\d+)`);
  for (const f of readdirSync(d).filter((x) => nameRe.test(x)).sort()) {
    const file = `${dir}/${f}`;
    const fm = parseFrontMatter(readFileSync(join(root, file), 'utf8'), file);
    const idFromName = f.match(idRe)[1];
    const dd = fm ? fm.data : {};
    out.set(idFromName, {
      file, id: dd.id || idFromName, idFromName, hasFrontMatter: !!fm,
      title: dd.title || '', status: dd.status || '', intent: dd.intent || '',
      opens: asList(dd.opens), adrs: asList(dd.adrs), spec: asList(dd.spec),
    });
  }
  return out;
}
export const loadIntents = (root = '.') => loadArtifacts(root, INTENT_DIR, 'INT');
export const loadSpecs = (root = '.') => loadArtifacts(root, SPEC_DIR, 'SPEC');

// ADR status is the `- **Status:** X` line of each docs/decisions/ADR-nnnn-*.md. An ADR with no such
// line is treated as Proposed: a decision nobody marked as taken has not been taken.
export function loadAdrs(root = '.') {
  const d = join(root, ADR_DIR);
  if (!existsSync(d)) return new Map();
  const out = new Map();
  for (const f of readdirSync(d).filter((x) => /^ADR-\d{4}.*\.md$/.test(x)).sort()) {
    const id = f.match(/^(ADR-\d{4})/)[1];
    const text = readFileSync(join(d, f), 'utf8');
    const m = text.match(/^\s*-\s*\*\*Status:\*\*\s*([A-Za-z]+)/m) || text.match(/^Status:\s*([A-Za-z]+)/m);
    // "- **Enforced by:**" names what holds the rule (ADR-0006); missing means prose only.
    const e = text.match(/^\s*-\s*\*\*Enforced by:\*\*\s*(.+)$/m);
    out.set(id, { id, file: `${ADR_DIR}/${f}`, status: m ? m[1] : null, enforcedBy: e ? e[1].trim() : null });
  }
  return out;
}

// The ids a `trace:` field names: SPEC-nnn and INT-nnn; anything else (US-x.y, SAD §n) is free text.
export const traceIds = (trace) => (String(trace || '').match(/\b(SPEC|INT)-\d+\b/g) || []);

// OPEN.md rows: | OPEN-001 | opened | question | proposal | blocks | status | recorded at |
//
// Read by COLUMN NAME, not by position: the table gained a column once (`opened`, v0.6.0) and a
// positional parser would have silently re-read every field one slot over. Unknown columns are
// ignored, missing ones come back empty, so a repo on the older 6-column table still parses.
const OPEN_COLUMNS = {
  opened: ['ngày mở', 'opened'],
  question: ['câu hỏi', 'question'],
  proposal: ['đề xuất của agent', "agent's proposal", 'proposal'],
  blocks: ['chặn', 'blocks'],
  status: ['trạng thái', 'status'],
  recordedAt: ['chốt ở', 'recorded at'],
};
// Legacy fallback for a table whose header row we cannot find at all.
const OPEN_LEGACY_INDEX = { question: 1, proposal: 2, blocks: 3, status: 4, recordedAt: 5, opened: -1 };

function splitRow(line) {
  const t = line.trim();
  if (!t.startsWith('|')) return null;
  return t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
}

export function loadOpens(root = '.') {
  const p = join(root, OPEN_FILE);
  if (!existsSync(p)) return null;
  const lines = readFileSync(p, 'utf8').split('\n');

  let index = null;
  for (const line of lines) {
    const cells = splitRow(line);
    if (!cells || cells[0].toLowerCase() !== 'id') continue;
    index = { ...OPEN_LEGACY_INDEX };
    for (const key of Object.keys(OPEN_COLUMNS)) index[key] = -1;
    for (const [i, head] of cells.entries()) {
      const h = head.toLowerCase();
      for (const [key, names] of Object.entries(OPEN_COLUMNS)) if (names.includes(h)) index[key] = i;
    }
    break;
  }
  if (!index) index = { ...OPEN_LEGACY_INDEX };

  const at = (cells, i) => (i >= 0 ? cells[i] || '' : '');
  const opens = new Map();
  for (const line of lines) {
    const cells = splitRow(line);
    if (!cells || !/^OPEN-\d+$/.test(cells[0])) continue;
    opens.set(cells[0], {
      id: cells[0],
      question: at(cells, index.question),
      blocks: at(cells, index.blocks),
      status: at(cells, index.status).toLowerCase(),
      recordedAt: at(cells, index.recordedAt),
      opened: at(cells, index.opened),
    });
  }
  return opens;
}

// ---------------------------------------------------------------------------
// Git facts. Every helper returns null when git cannot answer (no git, not a repo, no main yet), and
// callers fall back to what the working tree says.
// ---------------------------------------------------------------------------
function gitLines(root, args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (r.error || r.status !== 0) return null;
  return r.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
}

// The ref that stands for "main": the remote's default branch when fetched, else a local main/master.
export function mainRef(root = '.') {
  const head = gitLines(root, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD']);
  const candidates = [...(head ?? []), 'origin/main', 'main', 'origin/master', 'master'];
  for (const ref of candidates) if (gitLines(root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])) return ref;
  return null;
}

// true / false when git can tell whether `path` exists on main, null when it cannot.
function existsOnMain(root, ref, path) {
  if (!ref) return null;
  const r = spawnSync('git', ['cat-file', '-e', `${ref}:${path.replace(/\/+$/, '')}`], { cwd: root, encoding: 'utf8' });
  if (r.error) return null;
  return r.status === 0;
}

// A story is claimed while a branch named story/ST-xxx (optionally followed by -slug or /...) exists,
// locally or fetched from a remote, and is not yet merged into main. Branch refs are shared by every
// worktree of a clone, so a claim made in one worktree is visible from all of them — the story file's
// `status:` is not, because it is committed on the story branch.
// Across developers a claim exists only once the branch is on the remote (ADR-0007): the skills that
// hand out work fetch first. `loops-check` never fetches (it runs offline and inside hooks).
export function fetchRemote(root = '.') {
  const remotes = gitLines(root, ['remote']);
  if (!remotes?.length) return { ok: false, reason: 'no remote' };
  const r = spawnSync('git', ['fetch', '--prune', remotes.includes('origin') ? 'origin' : remotes[0]], { cwd: root, encoding: 'utf8' });
  return r.error || r.status !== 0 ? { ok: false, reason: (r.stderr || String(r.error)).trim() } : { ok: true };
}

// Days since the last fetch (mtime of FETCH_HEAD in the common git dir), null when never fetched or
// not answerable. A stale view of the remote is a stale view of other developers' claims.
export function fetchAgeDays(root = '.') {
  const common = gitLines(root, ['rev-parse', '--git-common-dir'])?.[0];
  if (!common) return null;
  try {
    const p = join(resolve(root, common), 'FETCH_HEAD'); // --git-common-dir is relative in a main checkout, absolute in a worktree
    if (!existsSync(p)) return null;
    return (Date.now() - statSync(p).mtimeMs) / 86_400_000;
  } catch {
    return null;
  }
}

// The next free id of a kind, looking at the working tree, main, and every local and remote branch:
// two developers who both fetched get different answers only if one of them has pushed (ADR-0007);
// loops-check fails on the duplicate when they have not.
export const ID_KINDS = {
  ST: { dir: STORY_DIR, width: 3 },
  INT: { dir: INTENT_DIR, width: 3 },
  SPEC: { dir: SPEC_DIR, width: 3 },
  ADR: { dir: ADR_DIR, width: 4 },
  OPEN: { file: OPEN_FILE, width: 3 },
};
export function nextId(root = '.', kind) {
  const spec = ID_KINDS[kind];
  if (!spec) throw new Error(`nextId: kind must be one of ${Object.keys(ID_KINDS).join(' | ')}`);
  const re = new RegExp(`\\b${kind}-(\\d+)\\b`, 'g');
  let max = 0;
  const scan = (text) => { for (const m of String(text).matchAll(re)) max = Math.max(max, Number(m[1])); };
  const refs = gitLines(root, ['for-each-ref', '--format=%(refname)', 'refs/heads/', 'refs/remotes/']) ?? [];
  if (spec.dir) {
    try { for (const f of readdirSync(join(root, spec.dir))) scan(f); } catch { /* no dir yet */ }
    for (const ref of refs) for (const f of gitLines(root, ['ls-tree', '-r', '--name-only', ref, '--', spec.dir]) ?? []) scan(f);
  } else {
    try { scan(readFileSync(join(root, spec.file), 'utf8')); } catch { /* no queue yet */ }
    for (const ref of refs) {
      const r = spawnSync('git', ['show', `${ref}:${spec.file}`], { cwd: root, encoding: 'utf8' });
      if (!r.error && r.status === 0) scan(r.stdout);
    }
  }
  return `${kind}-${String(max + 1).padStart(spec.width, '0')}`;
}

export function loadClaims(root = '.') {
  const ref = mainRef(root);
  if (!ref) return new Map();
  const refs = gitLines(root, ['for-each-ref', `--no-merged=${ref}`, '--format=%(refname)', 'refs/heads/story/', 'refs/remotes/']);
  const claims = new Map();
  for (const r of refs ?? []) {
    const m = r.match(/(?:^refs\/heads\/|^refs\/remotes\/[^/]+\/)story\/(ST-\d+)(?:$|[-/])/);
    if (!m) continue;
    const branch = r.replace(/^refs\/heads\//, '').replace(/^refs\/remotes\//, '');
    if (!claims.has(m[1])) claims.set(m[1], []);
    claims.get(m[1]).push(branch);
  }
  return claims;
}

// ---------------------------------------------------------------------------
// Readiness — the machine-checkable definition the skills (/loops:wave / /loops:start) rely on.
// ---------------------------------------------------------------------------
export function evaluate(stories, opens, root = '.', { specs = null, adrs = null } = {}) {
  const byId = new Map(stories.map((s) => [s.id, s]));
  const ref = mainRef(root);
  specs = specs ?? loadSpecs(root);
  adrs = adrs ?? loadAdrs(root);
  for (const s of stories) {
    if (s.legacy) continue;
    const blockers = [];
    for (const dep of s.depends_on) {
      const d = byId.get(dep);
      if (!d) blockers.push({ kind: 'dep', msg: `${dep} không tồn tại / ${dep} does not exist` });
      else if (d.legacy) blockers.push({ kind: 'dep', msg: `${dep} chưa có front matter / ${dep} has no front matter` });
      else if (d.status !== 'done') blockers.push({ kind: 'dep', msg: `${dep} chưa done / ${dep} not done` });
    }
    for (const o of s.opens) {
      const rec = opens ? opens.get(o) : undefined;
      if (!rec) blockers.push({ kind: 'open', msg: `${o} không có trong OPEN.md / ${o} missing from OPEN.md` });
      else if (rec.status !== 'closed') blockers.push({ kind: 'open', msg: `${o} chưa chốt / ${o} still open` });
    }
    // The generated tables must render the same on every machine, so they use the working tree only.
    // Whether a present file is also committed on main depends on local refs; loops-check reports
    // that separately instead of letting it leak into the tables.
    s.consumesOffMain = [];
    for (const c of s.consumes) {
      if (!existsSync(join(root, c))) blockers.push({ kind: 'consumes', msg: `consumes ${c} chưa có trên main / consumes ${c} not on main` });
      else if (existsOnMain(root, ref, c) === false) s.consumesOffMain.push(c);
    }
    // Design stage: a story split from a spec is not Ready while the spec is still a draft.
    for (const id of traceIds(s.trace)) {
      if (!id.startsWith('SPEC-')) continue;
      const sp = specs.get(id);
      if (!sp) blockers.push({ kind: 'spec', msg: `${id} không có file / ${id} has no file in ${SPEC_DIR}` });
      else if (sp.status !== 'accepted') blockers.push({ kind: 'spec', msg: `${id} chưa accepted / ${id} not accepted (${sp.status || 'no status'})` });
    }
    // Decisions settle before build: a Proposed ADR blocks a high-risk story and only notes a normal one.
    s.adrNotes = [];
    for (const a of s.adrs) {
      const rec = adrs.get(a);
      if (!rec) continue; // the missing-file case is a loops-check failure already
      if (rec.status === 'Accepted' || rec.status === 'Superseded') continue;
      const msg = `${a} chưa Accepted / ${a} not Accepted (${rec.status || 'no Status line'})`;
      if (s.class === 'high-risk') blockers.push({ kind: 'adr', msg });
      else s.adrNotes.push(msg);
    }
    s.blockers = blockers;
    s.machineReady = blockers.length === 0;
    // A story already in flight may legitimately stall on a question raised mid-land (/loops:start Step 5);
    // anything else blocking an in-progress story means its front matter lied.
    s.hardBlockers = blockers.filter((b) => b.kind !== 'open');
  }
  return stories;
}

// Two `owns` globs overlap when the literal path prefix of one starts the other.
// Deliberately conservative: a false "overlap" costs one line of narrowing a glob; a missed one costs a clobber.
export function globsOverlap(a, b) {
  const pa = literalPrefix(a);
  const pb = literalPrefix(b);
  return startsWithSegments(pa, pb) || startsWithSegments(pb, pa);
}
const literalPrefix = (g) => g.split('*')[0].replace(/\/+$/, '');
function startsWithSegments(longer, shorter) {
  if (shorter === '') return true;
  return longer === shorter || longer.startsWith(shorter + '/');
}

// Active = someone is working on it: status in-progress on this checkout, or claimed by an unmerged
// story branch (a story in progress elsewhere still reads `ready` here). A `ready` story nobody has
// started holds no paths yet, so two of them may overlap — /loops:wave chooses between them.
export const isActive = (s, claims) => !s.legacy && s.status !== 'done' && (s.status === 'in-progress' || claims.has(s.id));

function pairs(list, fn) {
  const out = [];
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++)
      for (const ga of list[i].owns)
        for (const gb of list[j].owns)
          if (fn(list[i], list[j]) && globsOverlap(ga, gb)) out.push({ a: list[i].id, b: list[j].id, ga, gb });
  return out;
}

// Two active stories with overlapping owns: the clobber class (L21).
export function ownershipConflicts(stories, claims = new Map()) {
  return pairs(stories.filter((s) => isActive(s, claims)), () => true);
}

// A ready story whose owns overlap an active one cannot start until that one lands.
export function waitingOnActive(stories, claims = new Map()) {
  const list = stories.filter((s) => !s.legacy && (isActive(s, claims) || s.status === 'ready'));
  return pairs(list, (x, y) => isActive(x, claims) !== isActive(y, claims));
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
const L = (root) => detectLanguage(root);
export function detectLanguage(root) {
  const p = join(root, BACKLOG_FILE);
  if (existsSync(p) && /## Backlog\n[\s\S]*?\| ID\s*\|\s*Story\s*\|\s*Trace\s*\|\s*Class/.test(readFileSync(p, 'utf8'))) return 'en';
  return 'vi';
}

export function renderBacklog(stories, lang) {
  const h = lang === 'en'
    ? ['ID', 'Story', 'Trace', 'Class', 'Status', 'Depends on', 'Blocked by']
    : ['ID', 'Story', 'Trace', 'Loại', 'Trạng thái', 'Phụ thuộc', 'Đang chờ'];
  const rows = [`| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`];
  for (const s of stories) {
    if (s.legacy) {
      rows.push(`| [${s.id}](${s.file.replace(STORY_DIR + '/', '')}) | *(no front matter)* | | | | | |`);
      continue;
    }
    const link = `[${s.id}](${s.file.replace(STORY_DIR + '/', '')})`;
    const blocked = s.status === 'done' ? '' : s.blockers.map((b) => b.msg.split(' / ')[lang === 'en' ? 1 : 0] ?? b.msg).join('; ');
    rows.push(
      `| ${link} | ${esc(s.title)} | ${esc(s.trace)} | ${CLASS_EMOJI[s.class] ?? s.class} | ${STATUS_EMOJI[s.status] ?? s.status} | ${s.depends_on.join(', ')} | ${esc(blocked)} |`,
    );
  }
  return rows.join('\n');
}

export function renderMatrix(stories, lang) {
  const h = lang === 'en' ? ['ID', 'Behavior', 'Proof', 'Status'] : ['ID', 'Hành vi', 'Proof', 'Trạng thái'];
  const byDomain = new Map();
  for (const s of stories) {
    if (s.legacy) continue;
    for (const p of s.proof) {
      if (!byDomain.has(p.domain)) byDomain.set(p.domain, []);
      byDomain.get(p.domain).push({ ...p, storyStatus: s.status });
    }
  }
  const out = [];
  for (const dom of [...byDomain.keys()].sort()) {
    out.push(`### ${dom}`, '', `| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`);
    const rows = byDomain.get(dom).sort((a, b) => numOf(a.id) - numOf(b.id));
    for (const p of rows) {
      const status = p.status ?? STATUS_EMOJI[p.storyStatus];
      const cell = status === '✅' ? '✅' : `${status} → ${p.story}`;
      const kind = p.kind.includes('`') ? p.kind : `\`${p.kind}\``; // proof text may already carry its own code spans
      out.push(`| ${p.id} | ${esc(p.behavior)} | ${esc(kind)} | ${cell} |`);
    }
    out.push('');
  }
  return out.join('\n').trimEnd();
}
const numOf = (id) => Number(id.split('-')[2]);
const esc = (s) => String(s).replace(/\|/g, '\\|');

export function replaceBlock(text, name, body, file) {
  const begin = `<!-- LOOPS:GEN ${name} -->`;
  const end = `<!-- LOOPS:GEN-END ${name} -->`;
  const i = text.indexOf(begin);
  const j = text.indexOf(end);
  if (i === -1 || j === -1 || j < i) throw new Error(`${file}: missing generated block markers for "${name}"`);
  return text.slice(0, i + begin.length) + '\n' + body + '\n' + text.slice(j);
}

export function generate(root = '.', { check = false } = {}) {
  const stories = loadStories(root);
  if (stories.every((s) => s.legacy)) return { stale: [], skipped: true, stories };
  const opens = loadOpens(root);
  evaluate(stories, opens, root);
  const lang = L(root);
  const targets = [
    [BACKLOG_FILE, 'backlog', renderBacklog(stories, lang)],
    [MATRIX_FILE, 'test-matrix', renderMatrix(stories, lang)],
  ];
  const stale = [];
  for (const [file, name, body] of targets) {
    const p = join(root, file);
    if (!existsSync(p)) continue;
    const before = readFileSync(p, 'utf8');
    const after = replaceBlock(before, name, body, file);
    if (after !== before) {
      stale.push(file);
      if (!check) writeFileSync(p, after);
    }
  }
  return { stale, skipped: false, stories, opens };
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href
  || (process.argv[1] && process.argv[1].endsWith('loops-gen.mjs'));
if (isMain) {
  const check = process.argv.includes('--check');
  const ni = process.argv.indexOf('--next-id');
  if (ni >= 0) {
    // The next free id of a kind across the working tree, main and every branch (ADR-0007).
    try { console.log(nextId('.', String(process.argv[ni + 1] ?? '').toUpperCase())); process.exit(0); } catch (e) { console.error(`loops-gen: ${e.message}`); process.exit(1); }
  }
  if (process.argv.includes('--claims')) {
    // What /loops:wave reads to know which stories are taken, whatever this checkout's story files say.
    // --fetch first asks the remote, so other developers' pushed claims are in the answer.
    if (process.argv.includes('--fetch')) {
      const f = fetchRemote('.');
      console.log(f.ok ? 'loops-gen --claims: fetched' : `loops-gen --claims: not fetched (${f.reason}) — claims from other clones may be missing`);
    }
    const stories = loadStories('.');
    const claims = loadClaims('.');
    const rows = stories.filter((s) => !s.legacy && s.status !== 'done' && (s.status === 'in-progress' || claims.has(s.id)));
    if (!rows.length) console.log('loops-gen --claims: no story is in progress or claimed by an unmerged story/* branch');
    for (const s of rows)
      console.log(`${s.id}\t${claims.has(s.id) ? claims.get(s.id).join(', ') : '(status in-progress, no unmerged branch)'}\towns: ${s.owns.join(', ') || '(none)'}`);
    process.exit(0);
  }
  try {
    const r = generate('.', { check });
    if (r.skipped) {
      console.log('loops-gen: no story has front matter yet — nothing to generate (legacy mode)');
    } else if (check) {
      if (r.stale.length) {
        console.error(`loops-gen --check: generated blocks are stale in: ${r.stale.join(', ')} — run "node scripts/loops-gen.mjs"`);
        process.exit(1);
      }
      console.log('loops-gen --check: generated blocks are current');
    } else {
      console.log(r.stale.length ? `loops-gen: rewrote ${r.stale.join(', ')}` : 'loops-gen: already current');
    }
  } catch (e) {
    console.error(`loops-gen: ${e.message}`);
    process.exit(1);
  }
}
