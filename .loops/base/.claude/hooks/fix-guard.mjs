#!/usr/bin/env node
// PreToolUse · Edit|Write|MultiEdit
// During a fix task (LOOPS_FIX_TASK=1 in the session's environment) the agent must not weaken the check
// on the code it is fixing: test files are frozen (playbook lesson 8, step 7 — "A test that existed
// before the fix, and that the agent couldn't rewrite, is proof the bug is gone"). Outside a fix task
// the hook does nothing. JSON decision form so the reason reaches the agent verbatim.
import { readInput, repoRoot, relPath, deny, run, EDIT_TOOLS, editedPaths, isTestPath } from './lib.mjs';

await run('fix-guard', async () => {
  if (process.env.LOOPS_FIX_TASK !== '1') return;
  const input = readInput();
  if (!input || !EDIT_TOOLS.has(input.tool_name)) return;
  const root = repoRoot(input);
  for (const p of editedPaths(input)) {
    const rel = relPath(root, p);
    if (isTestPath(rel)) deny(`fix-guard: LOOPS_FIX_TASK=1 — test files are frozen during a fix task (${rel}). Fix the code, not the test. If the test itself is wrong, say so and stop; a person decides whether to unfreeze (unset LOOPS_FIX_TASK).`);
  }
});
