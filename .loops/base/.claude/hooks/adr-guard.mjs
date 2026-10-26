#!/usr/bin/env node
// PreToolUse · Edit|Write|MultiEdit
// An Accepted ADR is immutable (LOOP.md rule 2, L11): to change it, write a new ADR that supersedes it
// and add a drift note in docs/decisions/README.md. Editing the body of an Accepted ADR, or writing
// over an existing Accepted ADR file, is blocked. New ADR files and Proposed ADRs are free to edit.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readInput, repoRoot, relPath, block, run, EDIT_TOOLS, editedPaths, editedOldStrings } from './lib.mjs';

await run('adr-guard', async () => {
  const input = readInput();
  if (!input || !EDIT_TOOLS.has(input.tool_name)) return;
  const root = repoRoot(input);
  for (const p of editedPaths(input)) {
    const rel = relPath(root, p);
    const m = rel.match(/^docs\/decisions\/(ADR-\d{4})[^/]*\.md$/);
    if (!m) continue;
    const abs = join(root, rel);
    if (!existsSync(abs)) continue; // a new ADR
    const text = readFileSync(abs, 'utf8');
    const status = (text.match(/^\s*-\s*\*\*Status:\*\*\s*([A-Za-z]+)/m) || [])[1];
    if (status !== 'Accepted') continue;
    // Header metadata stays editable on an Accepted ADR: the status flip to Superseded (and its link),
    // and the "Enforced by" line (ADR-0006). The body below is immutable.
    const olds = editedOldStrings(input);
    const onlyMetadata = input.tool_name !== 'Write' && olds.length && olds.every((o) => /Status|Superseded by|Enforced by/.test(o));
    if (onlyMetadata) continue;
    block(`adr-guard: ${m[1]} is Accepted and its body is immutable. Write a new ADR with "Supersedes: ${m[1]}" (docs/templates/decision.md), flip this one to "- **Status:** Superseded" with "Superseded by: ADR-nnnn", and add a drift note in docs/decisions/README.md if only part of it changed.`);
  }
});
