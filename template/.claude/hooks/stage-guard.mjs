#!/usr/bin/env node
// PreToolUse · Bash
// `git add -A`, `git add .`, `git add --all` and `git commit -a` stage whatever is in the tree, which
// is how a session commits another story's files (L21). Staging is by exact path in a loops repo.
import { readInput, block, run } from './lib.mjs';

await run('stage-guard', async () => {
  const input = readInput();
  // On Windows the shell tool is PowerShell (Git Bash may be absent); same command, same rule.
  if (!input || !['Bash', 'PowerShell'].includes(input.tool_name)) return;
  const cmd = String(input.tool_input?.command ?? '');
  // Every spelling that stages the whole tree: -A, --all, -u/--update (all tracked changes), ".", "./",
  // "*" (quoted or not), ":/" (the pathspec root), also after "--" (self-review F4).
  const addAll = /\bgit\s+(-C\s+\S+\s+)?add\s+(?:[^|&;\n]*\s)?['"]?(-A|--all|-u|--update|\.\/?|\*|:\/)['"]?(\s|$|[;&|])/.test(cmd);
  const commitAll = /\bgit\s+(-C\s+\S+\s+)?commit\b[^|&;\n]*\s(-a|--all|-am|-a[a-z]+)\b/.test(cmd);
  if (!addAll && !commitAll) return;
  block(`stage-guard: "${cmd.trim().slice(0, 120)}" stages everything in the working tree.
Stage by exact path: git add <each path under this story's owns> docs/stories/ST-xxx-*.md docs/stories/README.md docs/TEST_MATRIX.md. A file outside owns that had to change means the front matter is wrong — widen owns (then loops-check) or route the change to the owning story.`);
});
