---
id: ST-008
title: loops-update — three-way merge over a stored base, staged conflicts, all-or-nothing apply
trace: SPEC-002 row 1, INT-002 row 1, ADR-0005
class: high-risk
status: done
depends_on: []
consumes: []
owns: [template/scripts/loops-update.mjs, scripts/loops-update.mjs, test/update.mjs, skills/update/**, skills/init/**, loops-install-files.txt, .loops/**, .gitignore, .githooks/pre-push, template/scripts/loops-check.mjs]
opens: []
adrs: [ADR-0005]
proof:
  - T-UPD-1 | unit | init writes .loops/manifest.json (version, kind and sha256 per managed/mixed file) and .loops/base/<path>; status prints "current" right after | ✅
  - T-UPD-2 | unit | apply with an upstream change and no local edit rewrites the managed file, updates base and manifest version, exit 0 | ✅
  - T-UPD-3 | unit | apply with a local edit in another region than the upstream change keeps both lines (diff3 clean merge) | ✅
  - T-UPD-4 | unit | apply with overlapping edits exits 2, writes nothing to the live file, stages base/local/incoming/resolved under .loops/update/; --continue refuses while markers remain and applies once resolved; --abort removes the staging dir | ✅
  - T-UPD-5 | unit | a mixed file gets only its LOOPS:BEGIN/END block merged and the bytes outside the markers are byte-identical afterwards; a seeded file is never read or written | ✅
  - T-UPD-6 | unit | a path listed in manifest.frozen is skipped by apply and not reported by status; loops-check notes a managed file whose sha differs from its base and a manifest version that differs from LOOPS_VERSION | ✅
---

# Story Packet: ST-008 — Stored-base update

- **Owner:** TrungNguyen

## Goal

`/loops:update` stops guessing. The consumer's repo carries the exact base it was installed from, the merge is `git merge-file --diff3` per file or per marker block, and a conflict is staged next to the tree, never written into it (ADR-0005; repository-harness ADR 0024/0025 as the model).

## Scope

**In:** `template/scripts/loops-update.mjs` (plain node + git), root wrapper, `test/update.mjs`, `/loops:init` Step 3 records the base and adds `.loops/update/` to `.gitignore`, `/loops:update` rewritten around the script (migration Step 0b kept), manifest rows for the new script, `loops-check` item 14, this repo's own `.loops/` with the wrapper scripts and hooks frozen (ADR-0002).
**Out:** running it on project B (SPEC-002 out of scope); any rendering of slots — a merged line that still carries `{{…}}` is a conflict.

## Boundaries touched

`template/scripts/` (high-risk: what rewrites a consumer's files). `loops-check` (item 14).

## Design

- CLI: `node scripts/loops-update.mjs <init|status|apply|--continue|--abort> --plugin <dir>`; `--plugin` defaults to `$CLAUDE_PLUGIN_ROOT`; `status` and `--abort` need no plugin.
- Merge: temp files for BASE/LOCAL/UPSTREAM, `git merge-file -p --diff3 -L local -L base -L upstream`; exit code > 0 = conflicts. Mixed files: each `LOOPS:BEGIN <name>` block extracted from the three sides and merged on its own; a block missing in LOCAL is a conflict with the instruction to insert it.
- Staging layout under `.loops/update/`: `base/`, `local/`, `incoming/`, `resolved/` (what the person edits, starts as the diff3 output), `merged/` (clean results), `state.json` (plugin version, sha of each staged LOCAL for drift detection).
- Apply writes in one pass only after every merge succeeded; refuses on a dirty managed file (`git status --porcelain -- <paths>`) and on an existing staging dir.

## Acceptance Criteria

```gherkin
Scenario: overlapping edits never reach the tree
  Given a managed file edited locally on line 3 and upstream on line 3
  When apply runs
  Then exit is 2, the live file is byte-identical to before, and .loops/update/resolved/<path> holds the diff3 output

Scenario: resolve then continue
  Given the resolved file has no markers left
  When --continue runs
  Then the live file equals the resolved file, base and manifest are updated, and .loops/update/ is gone
```

## Closing checklist

- [x] `test/update.mjs` is called from `.githooks/pre-push`.
- [x] proof ✅; `loops-gen`; `loops-check` OK on this repo with its own `.loops/` (the wrapper scripts and hooks are `frozen`, ADR-0002).
- [x] Side fix: `loops-check` 8b now also scans untracked test files (self-review F2).
