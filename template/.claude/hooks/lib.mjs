// Shared helpers for the loops PreToolUse hooks. Plain node, no dependencies, no jq.
// A hook must never block because it failed: every helper throws only on programmer error, and each
// hook wraps its body in run(), which turns an exception into exit 0 plus a line on stderr.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';

export function readInput() {
  let raw = '';
  try { raw = readFileSync(0, 'utf8'); } catch { return null; }
  if (!raw.trim()) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// The repo root for the hook's decision: the worktree Claude is in (cwd from the input JSON), not
// ${CLAUDE_PROJECT_DIR}, which stays at the main checkout once a session has entered a worktree.
export function repoRoot(input) {
  let dir = resolve(input?.cwd || process.cwd());
  for (let i = 0; i < 40; i++) {
    if (existsSync(join(dir, '.git'))) return dir;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return resolve(input?.cwd || process.cwd());
}

// Current branch without spawning git: .git is a directory (main checkout) or a file "gitdir: <path>"
// (linked worktree); HEAD in that directory is "ref: refs/heads/<branch>" or a bare sha.
export function currentBranch(root) {
  try {
    let gitDir = join(root, '.git');
    if (statSync(gitDir).isFile()) {
      const m = readFileSync(gitDir, 'utf8').match(/gitdir:\s*(.+)/);
      if (!m) return null;
      gitDir = resolve(root, m[1].trim());
    }
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
    const m = head.match(/^ref: refs\/heads\/(.+)$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export const toPosix = (p) => String(p).replace(/\\/g, '/');

// Path of the tool call, relative to the repo root (posix separators). Absolute paths outside the
// root come back starting with "../" and are treated as outside every glob.
export function relPath(root, filePath) {
  const abs = resolve(root, String(filePath));
  return toPosix(relative(root, abs));
}

// Minimal glob → test: ** matches across segments, * within one. Same prefix idea loops-gen uses for
// overlap, applied to one concrete path.
export function globToRegExp(glob) {
  const g = toPosix(glob).replace(/^\.\//, '').replace(/\/+$/, '');
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') { re += '.*'; i++; if (g[i + 1] === '/') i++; }
      else re += '[^/]*';
    } else if ('.+?^${}()|[]\\'.includes(c)) re += '\\' + c;
    else re += c;
  }
  // a glob that names a directory (no wildcard, no extension) also covers everything under it
  return new RegExp(`^${re}(/.*)?$`);
}
export const matchesAny = (globs, rel) => globs.some((g) => globToRegExp(g).test(rel));

// The story front matter parser is the shipped one, loaded from the repo so the hook and loops-gen
// never disagree about what a list looks like.
export async function loadFrontMatterParser(root) {
  const p = join(root, 'scripts', 'loops-gen.mjs');
  if (!existsSync(p)) return null;
  const { pathToFileURL } = await import('node:url');
  const mod = await import(pathToFileURL(p).href);
  return mod.parseFrontMatter;
}

// Blocking is always the JSON form (exit 0 + permissionDecision: deny). Exit 2 is not used: on Windows,
// Claude Code runs hook commands under PowerShell, which reports every failing native command as status
// 1, and a hook that "errored" never blocks (measured 2026-10-06, Claude Code 2.1.290: a hook that
// exited 2 was logged as "status code 1" and the edit went through; the JSON form was honoured and its
// reason reached the model). The reason also goes to stderr for whoever reads the hook log.
export function block(reason) {
  process.stderr.write(reason.trim() + '\n');
  deny(reason);
}

export function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason.trim() },
  }));
  process.exit(0);
}

export async function run(name, fn) {
  try {
    await fn();
    process.exit(0);
  } catch (e) {
    process.stderr.write(`${name}: hook error ignored (${e?.message ?? e}) — the action was allowed\n`);
    process.exit(0);
  }
}

export const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
export const editedPaths = (input) => {
  const t = input?.tool_input ?? {};
  const list = [];
  if (t.file_path) list.push(t.file_path);
  if (t.notebook_path) list.push(t.notebook_path);
  if (Array.isArray(t.edits)) for (const e of t.edits) if (e?.file_path) list.push(e.file_path);
  return list;
};
export const editedOldStrings = (input) => {
  const t = input?.tool_input ?? {};
  const out = [];
  if (typeof t.old_string === 'string') out.push(t.old_string);
  if (Array.isArray(t.edits)) for (const e of t.edits) if (typeof e?.old_string === 'string') out.push(e.old_string);
  return out;
};
export const isTestPath = (rel) => /(^|\/)(test|tests|__tests__|spec)\/|\.(test|spec)\.[cm]?[jt]sx?$|_test\.(go|py|rb)$|Test\.(java|kt|cs)$/.test(rel);
