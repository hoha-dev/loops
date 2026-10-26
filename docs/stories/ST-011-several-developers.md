---
id: ST-011
title: Several developers — pushed claims, fetch before a wave, ids allocated across branches, owns-guard narrowed
trace: SPEC-002 row 9, INT-002 row 9, ADR-0007
class: high-risk
status: done
depends_on: [ST-009]
consumes: []
owns: [template/scripts/loops-gen.mjs, template/scripts/loops-check.mjs, template/.claude/hooks/owns-guard.mjs, skills/start/**, skills/wave/**, skills/next/**, skills/intent/**, skills/spec/**, template/docs/LOOP.md, template/docs/stories/README.md, test/run.mjs, test/hooks.mjs]
opens: []
adrs: [ADR-0007]
proof:
  - T-PAR-1 | unit | with a bare remote and two clones, a story branch pushed from clone A is listed by loops-gen --claims --fetch in clone B and makes an overlapping in-progress story fail loops-check there | ✅
  - T-PAR-2 | unit | loops-gen --next-id OPEN returns one more than the highest id found on main and on a remote branch that is not merged; --next-id ST, INT, SPEC, ADR likewise | ✅
  - T-PAR-3 | unit | loops-check fails on two intent files sharing one id and on an OPEN id listed twice, naming both locations; it notes when FETCH_HEAD is older than one day and a remote exists | ✅
  - T-HOOK-7 | unit | owns-guard on branch story/ST-019 allows a Write of a new docs/decisions/ADR-0003-x.md and an Edit of docs/decisions/OPEN.md, and blocks an Edit of the existing Proposed docs/decisions/ADR-0002-x.md | ✅
---

# Story Packet: ST-011 — Several developers

- **Owner:** TrungNguyen

## Goal

Two developers on two clones get the same answer from `/loops:wave`, never allocate the same id without the check catching it, and cannot edit each other's unaccepted decisions (ADR-0007).

## Scope

**In:** `loops-gen` flags `--fetch` (with `--claims`) and `--next-id <kind>`; `loops-check` item 15; `/loops:start` pushes the branch in Step 2 and the contract line says so; `/loops:wave`, `/loops:next` fetch first; `/loops:intent`, `/loops:spec` allocate ids with the tool; `owns-guard` allowance narrowed; LOOP.md "Running several developers at once" paragraph; stories README convention line; fixtures.
**Out:** an assignee field; a lock service; fetching inside `loops-check` (ADR-0007 rejected options).

## Boundaries touched

`template/.claude/hooks/owns-guard.mjs` (high-risk: what blocks an agent).

## Acceptance Criteria

```gherkin
Scenario: a claim crosses clones
  Given clone A pushed story/ST-001 and clone B has not fetched
  When clone B runs loops-gen --claims --fetch
  Then ST-001 is listed with origin/story/ST-001 as its branch
```

## Closing checklist

- [x] proof ✅; `loops-gen`; `loops-check` OK. Measured on this repo: `--next-id ST` → ST-013, `--next-id OPEN` → OPEN-004; `--claims --fetch` reports `not fetched (no remote)` because this repo has none (nothing is pushed).
