#!/usr/bin/env node
// PreToolUse · Edit|Write|MultiEdit
// The backlog table and the TEST_MATRIX block are loops-gen output. Editing them by hand is how two
// sessions clobbered each other (L21) and how a merge conflict got "resolved" into a lying table (L34).
// An Edit whose old_string lies inside a LOOPS:GEN block, or a Write of one of the two files, is denied
// with the command to run instead. Uses the JSON decision form so the reason reaches the agent verbatim.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readInput, repoRoot, relPath, deny, run, EDIT_TOOLS, editedPaths, editedOldStrings } from './lib.mjs';

const GENERATED = ['docs/stories/README.md', 'docs/TEST_MATRIX.md'];
const FIX = 'edit the story front matter instead and run "node scripts/loops-gen.mjs"; after a merge, resolve the conflict in the story files, then run the same command';

await run('generated-guard', async () => {
  const input = readInput();
  if (!input || !EDIT_TOOLS.has(input.tool_name)) return;
  const root = repoRoot(input);
  for (const p of editedPaths(input)) {
    const rel = relPath(root, p);
    if (!GENERATED.includes(rel)) continue;
    if (input.tool_name === 'Write') deny(`generated-guard: ${rel} holds a LOOPS:GEN block that only loops-gen writes — ${FIX}.`);
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const text = readFileSync(abs, 'utf8');
    const blocks = [...text.matchAll(/<!-- LOOPS:GEN (\S+) -->([\s\S]*?)<!-- LOOPS:GEN-END \1 -->/g)].map((m) => m[2]);
    for (const old of editedOldStrings(input)) {
      if (old && blocks.some((b) => b.includes(old))) deny(`generated-guard: that text in ${rel} is inside a LOOPS:GEN block that only loops-gen writes — ${FIX}.`);
    }
  }
});
