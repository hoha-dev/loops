---
id: ST-001
title: Transplant the predecessor harness core and prove it with the ported fixture tests
trace: SPEC-001 §Proof, INT-001
class: high-risk
status: done
depends_on: []
consumes: []
owns: [template/**, skills/**, test/run.mjs, scripts/**, .claude-plugin/**, .githooks/**, loops-install-files.txt, LESSONS.md, .gitattributes]
opens: []
adrs: [ADR-0001, ADR-0002, ADR-0003]
proof:
  - T-CORE-1 | unit | node test/run.mjs builds a repo from template/ and every ported case passes (15 cases) | ✅
  - T-CORE-2 | manual | No identifier of the old product remains in shipped files (grep for harness-check, harness-gen, HARNESS:, h-*, the predecessor harness is empty outside LESSONS.md history) | ✅
  - T-CORE-3 | manual | The repo root runs loops-gen and loops-check on its own docs through the one-line wrappers, and the pre-push hook calls both | ✅
---

# Story Packet: ST-001 — Transplant the core

- **Owner:** TrungNguyen

## Goal

loops starts from everything the harness learned, not from the course alone: the two scripts, the story front matter, the nine skills, the fixture tests and the 36 lessons, renamed and in one English template (ADR-0001), with the repo running the shipped check on itself (ADR-0002).

## Scope

**In:** copy `template-en/` → `template/`, rename `harness-*` → `loops-*`, `HARNESS:` markers → `LOOPS:`, `HARNESS.md` → `LOOP.md`, skills `h-*` → bare verbs (ADR-0003), plugin manifests, LESSONS translated, root docs filled for loops itself, root wrapper scripts, pre-push hook.
**Out:** any new rule or skill (ST-002 onward). The `HOW-IT-WORKS` pages of the old repo (docs are rewritten in ST-007, not ported).

## Boundaries touched (AGENTS.md)

All four. ADR-0001, ADR-0002, ADR-0003 were written for this story.

## Acceptance Criteria

```gherkin
Scenario: ported tests pass
  Given the repo at ST-001 done
  When node test/run.mjs runs
  Then every case prints ok and the runner prints "all cases passed"

Scenario: the repo checks itself with the shipped files
  Given scripts/loops-check.mjs at the root imports template/scripts/loops-check.mjs
  When node scripts/loops-gen.mjs && node scripts/loops-check.mjs run at the root
  Then the output ends with "loops-check: OK" and names .githooks/pre-push as the invoker
```

## Closing checklist

- [x] The wrappers are the consumer edge of `template/scripts/*.mjs` in this repo; the fixture runner is the other.
- [x] The gate names its invoker: `.githooks/pre-push`, with `core.hooksPath` set in this clone.
- [x] proof ✅; `loops-gen` run; `loops-check` OK.
