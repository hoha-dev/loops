#!/usr/bin/env node
// PreToolUse · Edit|Write|MultiEdit|NotebookEdit
// While a session is on a story branch (story/ST-xxx…), an edit outside that story's `owns` is
// blocked at the moment it is attempted — the rule loops-check only sees after the fact (L32) and
// that a sentence in AGENTS.md did not hold (L21). Not on a story branch: nothing is checked.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readInput, repoRoot, currentBranch, relPath, matchesAny, loadFrontMatterParser, block, run, EDIT_TOOLS, editedPaths } from './lib.mjs';

// Paths every story may touch regardless of owns: its own packet, the queue, the generated tables
// (written by loops-gen, but /loops:land stages them), and the review snapshots. Under decisions,
// intents and specs a story may only CREATE files (ADR-0007): an existing ADR, intent or spec there
// belongs to whoever wrote it, and another developer's Proposed ADR is not this story's to edit.
const ALWAYS = (id) => [`docs/stories/${id}-*.md`, 'docs/stories/README.md', 'docs/TEST_MATRIX.md', 'docs/decisions/OPEN.md', 'docs/reviews/**'];
const CREATE_ONLY = ['docs/decisions/**', 'docs/intents/**', 'docs/specs/**'];

await run('owns-guard', async () => {
  const input = readInput();
  if (!input || !EDIT_TOOLS.has(input.tool_name)) return;
  const root = repoRoot(input);
  const branch = currentBranch(root);
  const m = branch && branch.match(/^story\/(ST-\d+)/);
  if (!m) return; // not a story session: the guard has nothing to compare against
  const id = m[1];
  const dir = join(root, 'docs', 'stories');
  let file = null;
  try { file = readdirSync(dir).find((f) => f.startsWith(`${id}-`) && f.endsWith('.md')); } catch { return; }
  if (!file) return;
  const parse = await loadFrontMatterParser(root);
  if (!parse) return;
  const fm = parse(readFileSync(join(dir, file), 'utf8'), `docs/stories/${file}`);
  if (!fm) return;
  const owns = Array.isArray(fm.data.owns) ? fm.data.owns : fm.data.owns ? [fm.data.owns] : [];
  for (const p of editedPaths(input)) {
    const rel = relPath(root, p);
    if (matchesAny(owns, rel) || matchesAny(ALWAYS(id), rel)) continue;
    if (matchesAny(CREATE_ONLY, rel)) {
      if (!existsSync(join(root, rel))) continue;
      block(`owns-guard: ${rel} exists and is not ${id}'s to edit (a story may create files under docs/decisions, docs/intents, docs/specs, and edit docs/decisions/OPEN.md; an existing one belongs to the story or spec that wrote it — ADR-0007).
Two ways out: (1) if the decision has to change, write a new ADR that supersedes it, or file the question as an OPEN row; (2) if this file is really ${id}'s, add its path to owns in docs/stories/${file} and run the check.`);
      continue;
    }
    block(`owns-guard: ${rel} is outside the owns of ${id} (${owns.join(', ') || 'owns is empty'}).
Two ways out: (1) add the glob to owns in docs/stories/${file}, run "node scripts/loops-gen.mjs && node scripts/loops-check.mjs" — the check fails if another active story owns that path; (2) leave this file to the story that owns it and record the need in that story. Do not edit around the guard.`);
  }
});
