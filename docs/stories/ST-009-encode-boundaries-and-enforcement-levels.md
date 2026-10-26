---
id: ST-009
title: /loops:encode, the "Enforced by" line, and the four enforcement levels in every report
trace: SPEC-002 rows 2 3 6, INT-002 rows 2 3 6, ADR-0006
class: normal
status: done
depends_on: [ST-008]
consumes: []
owns: [skills/encode/**, skills/review/**, skills/init/**, skills/land/**, template/docs/templates/decision.md, template/docs/decisions/README.md, template/docs/LOOP.md, template/scripts/loops-gen.mjs, template/scripts/loops-check.mjs, template/.claude/hooks/adr-guard.mjs, test/run.mjs, test/hooks.mjs, evals/skills/encode.json, template/evals/skills/encode.json]
opens: []
adrs: [ADR-0006]
proof:
  - T-ENF-1 | unit | loops-check notes an ADR referenced from an AGENTS.md boundary that has no "Enforced by:" line, and is silent once the line exists | ✅
  - T-ENF-2 | unit | loops-check item 9 prints "declared in" with the sentence that CI presence is not proof of a run and branch protection is unverified | ✅
  - T-HOOK-8 | unit | adr-guard allows an Edit whose old_string is the "Enforced by" line of an Accepted ADR and still blocks a body edit | ✅
  - T-SKL-9 | manual | skills/encode/SKILL.md walks authority → boundary table → smallest check → positive and negative proof → Enforced by line → four levels; evals/skills/encode.json has three phrasings | ✅
---

# Story Packet: ST-009 — Encode boundaries

- **Owner:** TrungNguyen

## Goal

A reader of an ADR knows what holds the rule; a reader of a loops report cannot mistake a CI file for a merge gate (ADR-0006).

## Scope

**In:** the new skill, the template field, the parser, check items 5b and 9 wording, the land PR template line, review Step 2 opening, init Step 1 inventory table and Step 3.4 "Enforced by", LOOP.md §Hooks one sentence on the four levels, adr-guard allowance, fixtures, eval phrasings, this repo's ADR-0001…0004 get their lines (header metadata, ADR-0006 point 1).
**Out:** failing on a missing line (OPEN-003); verifying CI or branch protection from the repo.

## Acceptance Criteria

```gherkin
Scenario: a boundary without enforcement is named
  Given AGENTS.md lists a boundary "→ ADR-0009" and ADR-0009 has no "Enforced by:" line
  When loops-check runs
  Then it exits 0 and prints a note naming ADR-0009 and /loops:encode
```

## Closing checklist

- [x] proof ✅; `loops-gen`; `loops-check` OK, with no 5b note on this repo (ADR-0001…0004 got their lines; ADR-0003 says "none yet — prose only", which is the truth).
