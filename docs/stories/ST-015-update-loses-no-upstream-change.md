---
id: ST-015
title: loops-update never drops an upstream change — every conflicting block staged, base-less files shown as conflicts, REVIEW.md carries a block
trace: ADR-0005 points 1-3 · docs/reviews/2026-10-26-v0.2-review.md F1 F2 F3 F8
class: high-risk
status: in-progress
depends_on: []
consumes: []
owns: [template/scripts/loops-update.mjs, test/update.mjs, skills/update/SKILL.md, loops-install-files.txt, template/REVIEW.md, REVIEW.md, CHANGELOG.md, .claude-plugin/plugin.json, docs/LOOP.md, .loops/**]
opens: []
adrs: [ADR-0005]
proof:
  - T-UPD-9 | unit | a mixed file with two blocks changed upstream, one conflicting locally, stages the conflicting block and carries the clean one; after --continue both upstream changes are in the file | ☐
  - T-UPD-10 | unit | a managed file with no stored base whose local text differs from upstream is staged as a conflict, never reported unchanged | ☐
  - T-UPD-11 | unit | init on a repo whose files already exist records a base only for files byte-equal to the template; the next apply stages every other differing file | ☐
  - T-UPD-12 | unit | every file listed as mixed in loops-install-files.txt has at least one LOOPS:BEGIN block in template/ | ☐
  - T-UPD-13 | unit | apply with no managed file to touch succeeds while an unrelated file is dirty | ☐
---

# Story Packet: ST-015 — loops-update never drops an upstream change

- **Owner:** Trung Nguyen

## Goal

The review of 2026-10-26 reproduced two ways `loops-update` loses an upstream change without a message and then records the new version, so no later update can bring it back (F1, F2), one file the updater can never reach (F3), and one refusal on an unrelated dirty file (F8). After this story an update either applies every upstream change or stages it.

## Scope

**In:**
- `planFile` mixed branch: merge every upstream block; stage each conflicting block as `path#block`; keep the clean merges for `merged/` (F2). `--continue` already applies several blocks of one file in sequence.
- Managed file with no stored base: LOCAL ≠ UPSTREAM is a conflict with an empty base side, using the reason text already at `loops-update.mjs:104` (F1).
- `init` on a repo whose managed files already exist: record a base only for a file byte-equal to the template; other files get no base entry, so the first `apply` stages them (F1). `skills/update/SKILL.md` Step 0a describes what then happens.
- `template/REVIEW.md`: the loops-owned passes inside a `LOOPS:BEGIN review` block; the "Do not report" list stays outside it (F3). This repo's `REVIEW.md` gets the same markers.
- `dirtyManaged` with an empty path list returns no dirty files instead of reading the whole tree (F8).
- Version 0.2.6.

**Out:** running the migration on project B — review action 2, after this story lands, on a copy of that repo.

## Related boundaries (AGENTS.md)

ADR-0002 (the root runs the shipped file; this repo's own `.loops/` is re-stamped by `apply --plugin .`). ADR-0005 points 1-3: this story makes the code meet them, it changes none.

## Acceptance Criteria (Gherkin)

```gherkin
Scenario: two blocks changed upstream, one conflicting
  Given docs/LOOP.md with blocks core and rituals, both edited upstream, core also edited locally on the same line
  When loops-update apply runs, the conflict in core is resolved, and --continue runs
  Then the file holds the upstream rituals change and the resolved core
  And a second apply reports nothing to do

Scenario: repo installed before v0.2
  Given a repo with old template files and no .loops/
  When init then apply run against the current plugin
  Then every file that differs from the template is staged as a conflict and nothing is reported "current" until they are resolved
```

## Story-closing checklist

- [ ] The new cases fail on the code at `e168729` and pass after (say so in the PR with both runs).
- [ ] All `proof` rows ✅; `node scripts/loops-gen.mjs`; `node scripts/loops-check.mjs` OK; full pre-push set green.
