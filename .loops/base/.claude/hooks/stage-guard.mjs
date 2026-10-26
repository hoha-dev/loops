#!/usr/bin/env node
// PreToolUse · Bash
// `git add -A`, `git add .`, `git add --all` and `git commit -a` stage whatever is in the tree, which
// is how a session commits another story's files (L21). On a story branch, staging is by exact path.
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { readInput, repoRoot, currentBranch, block, run } from './lib.mjs';

const STORY = /^story\/ST-\d+/;
const word = (s) => s.match(/^\s*(?:"([^"]*)"|'([^']*)'|(\S+))/)?.slice(1).find((x) => x !== undefined);

// The directories a command can stage in, so a session in the main checkout cannot stage a whole story
// worktree by naming it: the session's cwd, then each `cd <dir>` in order (relative to the previous one)
// and each `git -C <dir>`. A target the hook cannot know (`$VAR`, a subshell) comes back as null.
function targetDirs(input, cmd) {
  let cur = resolve(input.cwd || process.cwd());
  const dirs = [cur];
  const at = (w) => (w === undefined || /[$`]/.test(w) ? null : resolve(cur, w.replace(/^~(?=\/|$)/, homedir())));
  for (const piece of cmd.split(/\n|;|&&|\|\||\||\(|\)/)) {
    const cd = piece.match(/^\s*cd\s+(.*)$/);
    if (cd) { const d = at(word(cd[1])); dirs.push(d); if (d) cur = d; }
    for (const m of piece.matchAll(/\bgit\s+-C\s*=?\s*(.*)/g)) dirs.push(at(word(m[1])));
  }
  return dirs;
}

// Whether the repo has a linked worktree on a story branch (read from .git/worktrees/*/HEAD, no git process).
function hasStoryWorktree(root) {
  try {
    const dir = join(root, '.git', 'worktrees');
    if (!statSync(dir).isDirectory()) return false;
    return readdirSync(dir).some((w) => STORY.test(readFileSync(join(dir, w, 'HEAD'), 'utf8').trim().replace(/^ref: refs\/heads\//, '')));
  } catch {
    return false;
  }
}

await run('stage-guard', async () => {
  const input = readInput();
  // On Windows the shell tool is PowerShell (Git Bash may be absent); same command, same rule.
  if (!input || !['Bash', 'PowerShell'].includes(input.tool_name)) return;
  // The rule is about one story's owns, so it holds on a story branch only (as owns-guard does): on main,
  // or in a throwaway repo a command builds, there is no owns to stage by.
  const cmd = String(input.tool_input?.command ?? '');
  const dirs = targetDirs(input, cmd);
  const onStory = dirs.some((d) => d && STORY.test(currentBranch(repoRoot({ cwd: d })) ?? ''));
  const unknownNearStory = dirs.includes(null) && hasStoryWorktree(repoRoot(input));
  if (!onStory && !unknownNearStory) return;
  // Every spelling that stages the whole tree: -A, --all, -u/--update (all tracked changes), ".", "./",
  // "*" (quoted or not), ":/" (the pathspec root), also after "--" (self-review F4).
  const addAll = /\bgit\s+(-C\s*=?\s*(?:"[^"]*"|'[^']*'|\S+)\s+)?add\s+(?:[^|&;\n]*\s)?['"]?(-A|--all|-u|--update|\.\/?|\*|:\/)['"]?(\s|$|[;&|])/.test(cmd);
  const commitAll = /\bgit\s+(-C\s*=?\s*(?:"[^"]*"|'[^']*'|\S+)\s+)?commit\b[^|&;\n]*\s(-a|--all|-am|-a[a-z]+)\b/.test(cmd);
  if (!addAll && !commitAll) return;
  block(`stage-guard: "${cmd.trim().slice(0, 120)}" stages everything in the working tree.
Stage by exact path: git add <each path under this story's owns> docs/stories/ST-xxx-*.md docs/stories/README.md docs/TEST_MATRIX.md. A file outside owns that had to change means the front matter is wrong — widen owns (then loops-check) or route the change to the owning story.`);
});
