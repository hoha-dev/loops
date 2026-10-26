---
id: ST-010
title: An improvement experiment is a file with a removal condition
trace: SPEC-002 row 4, INT-002 row 4
class: normal
status: done
depends_on: [ST-008]
consumes: []
owns: [template/docs/templates/improvement.md, docs/templates/improvement.md, skills/improve/**]
opens: []
adrs: []
proof:
  - T-SKL-10 | manual | docs/templates/improvement.md has the fields representative job · baseline · earliest gap (one of six kinds) · owner · hypothesis "If X at Y then a fresh agent will Z because M" · evidence that would weaken it · maintenance owner and removal condition · fresh rerun · verdict; /loops:improve writes docs/reviews/YYYY-MM-DD-improve-<slug>.md from it and adds the LESSONS entry only on Keep | ✅
---

# Story Packet: ST-010 — Improvement experiments on file

- **Owner:** TrungNguyen

## Goal

`/loops:improve` leaves a record a later reader can falsify: what was tried, what would have shown it wrong, and when to remove it (repository-harness `templates/harness-improvement.md` as the model).

## Scope

**In:** the template (managed, listed in the manifest by ST-008's row convention), the skill rewrite, the root copy of the template for the dogfood docs.
**Out:** retro-fitting experiment files for v0.1 changes.

## Closing checklist

- [x] proof ✅; `loops-gen`; `loops-check` OK. The manifest row for the template was added here (the base of this repo is re-recorded in ST-012 with the version bump).
