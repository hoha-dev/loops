---
id: ST-014
title: /loops:init rewrites the foundation checklist from the repo's SAD and ADRs
trace: ADR-0002 (template is payload) · found installing loops into a consumer repo
class: normal
status: done
depends_on: [ST-013]
consumes: []
owns: [skills/init/SKILL.md, CHANGELOG.md, .claude-plugin/plugin.json, docs/LOOP.md, .loops/**]
opens: []
adrs: []
proof:
  - T-SKL-12 | manual | skills/init/SKILL.md Step 3 rewrites "This repo's foundation checklist" in docs/LOOP.md from the SAD and the ADRs it generated, one seam per line with its ADR, and Step 4 checks that none of the shipped example lines is left | ✅
---

# Story Packet: ST-014 — init localizes the foundation checklist

- **Owner:** Trung Nguyen

## Goal

`docs/LOOP.md` ships a foundation checklist that says it was "localized from the SAD at init", but no step of `/loops:init` does that. Installing loops into a Godot game on 2026-10-26 left the web-app lines in place (request context, auth guard, transaction seam, contract→client pipeline); the first foundation pass would have read a checklist with no line that applies.

## Scope

**In:** one sub-step in `skills/init/SKILL.md` Step 3 and one item in Step 4. Version 0.2.5.
**Out:** a `loops-check` item that detects the shipped lines: it would read a repo-owned part of LOOP.md and touch `template/scripts/` (high-risk); the skill step is enough until a second repo shows the step being skipped.

## Closing checklist

- [x] proof ✅; `loops-gen`; `loops-check` OK; full pre-push set green.
