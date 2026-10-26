---
id: SPEC-001
title: loops v0.1 — the six-stage layout with the transplanted core
intent: INT-001
status: accepted
accepted_by: TrungNguyen (PO + tech lead)
accepted_on: 2026-10-06
adrs: [ADR-0001, ADR-0002, ADR-0003, ADR-0004]
opens: []
---

# Spec: SPEC-001 — loops v0.1

## Problem and users

See INT-001. One user today (the owner); project B as the first consuming repo.

## Proposed behaviour

A repo with two faces:

- **The payload, `template/`**, laid out by the playbook's stages. Plan: `docs/intents/` + `templates/intent.md`. Design: `docs/specs/` + `templates/spec.md`, ADRs with a status that gates Ready. Build: story packets, `loops-gen`, `/loops:wave|start|land`, plan mode on start. Test: the verification set in AGENTS.md, `evals/` for the agent configuration, a hook that freezes tests during a fix. Deploy: `REVIEW.md`, the five hooks in `.claude/settings.json`, CI workflow templates (GitHub Actions and GitLab CI) that call `loops-check` and the evals. Maintain: `loops-check`'s time signals, surfaced by `/loops:next` as proposals.
- **The plugin**: eleven skills under `/loops:`.

The repo root is a consuming repo of its own template (ADR-0002).

## Main flow

```
/loops:intent  → docs/intents/INT-nnn.md (status draft → accepted by the PO)
/loops:spec    → docs/specs/SPEC-nnn.md + OPEN rows + ADR (Proposed) for every point a person decides
               → PO resolves OPEN + ADR in one sitting → spec accepted
story packets  → trace: SPEC-nnn; Ready = deps done · opens empty · consumes on main · owns disjoint · ADRs Accepted
/loops:wave    → the parallel-safe set; /loops:start → worktree + plan mode + working contract; hooks guard owns
/loops:land    → 0-cache verification, proof ✅, tables regenerated, headless review per REVIEW.md, PR with evidence
/loops:review  → milestone snapshot; findings close in one of three states
loops-check    → time signals (OPEN age, review distance, stray files) → /loops:next proposes an intent
```

## Constraints applied

ADR-0001 (English, one template) · ADR-0002 (dogfood) · ADR-0003 (plugin-only) · ADR-0004 (hook / check / prose layers). Playbook lessons 6, 8, 11 for the hook design; lessons 2–3 for intent/spec; the predecessor harness L8, L21, L26, L32, L33, L34 for what the core must keep.

## Points a person has to decide

- OPEN-001 — one person is PO and tech lead; who signs? — proposal: the same person, in one sitting, the OPEN queue is the only inbox. Resolved 2026-10-06: accepted as proposed (recorded in OPEN.md).
- ADR-0004 (Proposed → Accepted 2026-10-06) — hooks as the deterministic layer.

## Out of scope

- Managed settings, sandbox, MCP deploy tools, Claude Tag, Agent SDK service: not needed because the only consumer is a single-machine personal project with no admin console and no automated deploy (INT-001).
- A CI that actually runs on project B's GitLab: that repo froze its CI by its own decision (project B ADR-0014 chose Jenkins); loops ships the workflow *templates* only.
- Auto mode as default: the playbook's own precondition list (tuned CLAUDE.md, skills, hooks, test suite) is what ST-004–ST-006 build; revisit after a dogfood story has run with hooks on.

## Proof

- The ported fixture tests pass unchanged in behaviour (15 cases after removing the template-identity case).
- A story whose spec is `draft` cannot be Ready; a high-risk story whose ADR is `Proposed` cannot be Ready.
- Each hook blocks its case and allows the others, with a fixture per hook; `loops-check` fails when a hook in settings.json has no script.
- `loops-check` runs on this repo from the shipped files and prints OK.
