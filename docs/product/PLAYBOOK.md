# PLAYBOOK.md — the product contract of loops

> What loops implements: "The AI-native SDLC playbook" (Claude Academy, 14 lessons, 12 plays in 6 stages, read 2026-10-06), reduced to the plays a single-machine team can run, plus the mechanisms the predecessor harness added that the playbook lacks. This file is the contract, not a summary of the course.

| Stage | Play (lesson) | What loops ships | Gate type |
|---|---|---|---|
| Plan | Capture as intent.md (2) | `docs/intents/`, `templates/intent.md`, `/loops:intent` | human: PO accepts |
| Design | Requirements and design (3) | `docs/specs/`, `templates/spec.md`, `/loops:spec`, `/loops:sync`; ADR Proposed blocks Ready | human + check |
| Build | Plan mode (4) · CLAUDE.md (5) · Skills (6) · Parallel sessions and subagents (7) | story packets, `loops-gen`, `/loops:wave|start|land|next`, AGENTS.md 120-line budget, `.claude/agents/` | check + hook |
| Test | Feedback loop (8) · Continuous evals (9) | verification set in AGENTS.md, 0-cache rule, `fix-guard`, `evals/` | hook + check |
| Deploy | PR review (10) · Hooks as approval gates (11) · CI/CD (12) | `REVIEW.md`, five hooks in `.claude/settings.json`, `template/ci/` | hook + human (branch protection) |
| Maintain | Closing the loop (13) | `loops-check` time signals → `/loops:next` proposes an intent | check |

Out of scope by decision (INT-001, SPEC-001): managed settings, sandbox, MCP deploy tools, Claude Tag, Agent SDK, auto mode as default.

## Changelog

| Date | Change |
|---|---|
| 2026-10-06 | v0.1: contract written from INT-001 / SPEC-001 |
