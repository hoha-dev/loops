# docs/stories — Story Packets & Backlog

> Normal/High-risk work is split into story packets before coding (FEATURE_INTAKE). Each packet traces back to a requirement code in the product contract.

## Conventions

- **Stable IDs:** `ST-xxx` assigned sequentially, never reused. Merging/splitting stories mid-flight is normal — old IDs stay, the story body points to where the work landed.
- **One source of status:** status lives in the story file's front matter (`status:`). The table below is a **generated artifact** of `node scripts/loops-gen.mjs` — never edit or re-sort it by hand; edit the story and re-run. `loops-check` fails when the table disagrees with the stories.
- **Ready is a machine-checkable state**, not a feeling: every `depends_on` is done · `opens` is empty · every `consumes` exists on main · `owns` does not overlap an active story (`in-progress`, or with an unmerged `story/ST-xxx` branch). The "Blocked by" column lists exactly what is missing.
- **Parallel work:** only Ready stories with disjoint `owns` run at the same time (`/loops:wave` lists that set). Each session takes exactly one story in its own worktree and stages only paths inside its `owns` plus its own story file. Story branches are named starting with `story/ST-xxx`: `loops-check` reads the branches to know which stories someone is working on.
- **Across developers:** a claim is the `story/ST-xxx` branch **on the remote** — `/loops:start` pushes it before any work, and `/loops:wave` fetches before it computes (`loops-gen --claims --fetch`). Ids come from `loops-gen --next-id ST` (it counts every branch); a duplicate that still gets through two clones fails `loops-check` after the merge, and the one merged last renumbers.
- **Conflicts in the table below after a merge:** never fix them by hand. Resolve the story files first, then run `node scripts/loops-gen.mjs`.

## Backlog

<!-- LOOPS:GEN backlog -->
| ID | Story | Trace | Class | Status | Depends on | Blocked by |
| --- | --- | --- | --- | --- | --- | --- |
| [ST-001](ST-001-transplant-the-core.md) | Transplant the predecessor harness core and prove it with the ported fixture tests | SPEC-001 §Proof, INT-001 | 🔴 | ✅ |  |  |
| [ST-002](ST-002-intent-and-spec-before-story.md) | Intent and spec before any story — templates, folders, the trace check, and the two skills | SPEC-001 §Main flow, playbook lessons 2–3 | 🔴 | ✅ | ST-001 |  |
| [ST-003](ST-003-adr-settled-before-ready.md) | ADRs are settled before a high-risk story is Ready — status gating, Proposed ADRs in the queue, the sync skill | SPEC-001 §Main flow, INT-001 (ADRs 12–18 days late on project B) | 🔴 | ✅ | ST-001 |  |
| [ST-004](ST-004-hooks-as-the-deterministic-layer.md) | Five PreToolUse hooks that block the boundaries at edit time, with fixtures and a check that they are wired | SPEC-001 §Proof, ADR-0004, playbook lessons 8 and 11 | 🔴 | ✅ | ST-001 |  |
| [ST-005](ST-005-agents-plan-mode-and-review-per-pr.md) | Verifier and reviewer subagents, plan mode on start, REVIEW.md and the headless review on land | SPEC-001 §Main flow, playbook lessons 4, 7, 10 | 🟡 | ✅ | ST-004 |  |
| [ST-006](ST-006-evals-for-the-agent-configuration.md) | Evals for the agent configuration — one trigger eval per skill, a checker without jq, a documented cost | SPEC-001 §Main flow, playbook lessons 6 (step 4) and 9 | 🟡 | ✅ | ST-002, ST-003 |  |
| [ST-007](ST-007-workflow-templates-and-usage-docs.md) | CI workflow templates, the WORKFLOW doc, README usage, and the migration note for a repo on the predecessor harness | SPEC-001 §Proposed behaviour, playbook lessons 12 and 14 | 🟡 | ✅ | ST-002, ST-003, ST-004, ST-005, ST-006 |  |
| [ST-008](ST-008-stored-base-update.md) | loops-update — three-way merge over a stored base, staged conflicts, all-or-nothing apply | SPEC-002 row 1, INT-002 row 1, ADR-0005 | 🔴 | ✅ |  |  |
| [ST-009](ST-009-encode-boundaries-and-enforcement-levels.md) | /loops:encode, the "Enforced by" line, and the four enforcement levels in every report | SPEC-002 rows 2 3 6, INT-002 rows 2 3 6, ADR-0006 | 🟡 | ✅ | ST-008 |  |
| [ST-010](ST-010-improvement-experiments-on-file.md) | An improvement experiment is a file with a removal condition | SPEC-002 row 4, INT-002 row 4 | 🟡 | ✅ | ST-008 |  |
| [ST-011](ST-011-several-developers.md) | Several developers — pushed claims, fetch before a wave, ids allocated across branches, owns-guard narrowed | SPEC-002 row 9, INT-002 row 9, ADR-0007 | 🔴 | ✅ | ST-009 |  |
| [ST-012](ST-012-mechanical-release.md) | CHANGELOG, a release check, version 0.2.0, and the docs that describe v0.2 | SPEC-002 row 5, INT-002 row 5 | 🟡 | ✅ | ST-008, ST-009, ST-010, ST-011 |  |
| [ST-013](ST-013-boundary-lines-and-executable-hook.md) | loops-check 5b reads only boundary lines, item 9 sees a non-executable .githooks hook, init names one template | ADR-0006 points 1 and 3 | 🔴 | ✅ |  |  |
| [ST-014](ST-014-init-localizes-foundation-checklist.md) | /loops:init rewrites the foundation checklist from the repo's SAD and ADRs | ADR-0002 (template is payload) · found installing loops into a consumer repo | 🟡 | ✅ | ST-013 |  |
| [ST-015](ST-015-update-loses-no-upstream-change.md) | loops-update never drops an upstream change — every conflicting block staged, base-less files shown as conflicts, REVIEW.md carries a block | ADR-0005 points 1-3 · docs/reviews/2026-10-26-v0.2-review.md F1 F2 F3 F8 | 🔴 | ☐ |  |  |
| [ST-016](ST-016-stage-guard-story-scoped.md) | stage-guard applies only on a story branch; /loops:start says when the claim becomes visible | ADR-0004, ADR-0007 · docs/reviews/2026-10-26-v0.2-review.md F4 F7 | 🔴 | ☐ | ST-015 | ST-015 not done |
| [ST-017](ST-017-run-the-eval-suite.md) | Run the eval suite once and attest the manual skill proofs by a run | SPEC-002 · docs/reviews/2026-10-06-v0.1-self-review.md F5 · docs/reviews/2026-10-26-v0.2-review.md F5 | 🟡 | ☐ |  | OPEN-004 still open |
| [ST-018](ST-018-tests-never-touch-the-real-repo.md) | Fixture tests never write to the real repo, even when pre-push runs from a linked worktree | AGENTS.md "Common commands" (pre-push runs the full set) · incident 2026-10-26 during /loops:start ST-015 | 🟡 | 🟡 |  |  |
<!-- LOOPS:GEN-END backlog -->

## Template

[`../templates/story.md`](../templates/story.md) — the front matter is mandatory.
