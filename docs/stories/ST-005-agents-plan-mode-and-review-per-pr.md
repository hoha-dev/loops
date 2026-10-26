---
id: ST-005
title: Verifier and reviewer subagents, plan mode on start, REVIEW.md and the headless review on land
trace: SPEC-001 §Main flow, playbook lessons 4, 7, 10
class: normal
status: done
depends_on: [ST-004]
consumes: []
owns: [template/.claude/agents/**, template/REVIEW.md, skills/start/**, skills/land/**, skills/review/**, loops-install-files.txt]
opens: []
adrs: [ADR-0003]
proof:
  - T-SKL-4 | manual | /loops:start opens the reading step in plan mode and prints the working contract with the active hooks before any edit | ✅
  - T-SKL-5 | manual | /loops:land step 5 runs the headless review from REVIEW.md on the diff and attaches the findings to the PR description, without the findings approving or blocking anything | ✅
  - T-SKL-6 | manual | /loops:review names .claude/agents/reviewer.md as the parallel reader and keeps the rule that readers do not run the gates (L27) | ✅
  - T-DOC-4 | manual | template/REVIEW.md has three passes (bugs, security, compliance with the story AC and ADRs), the Important/Nit definition, a nit cap, and excludes LOOPS:GEN blocks and what loops-check already verifies | ✅
---

# Story Packet: ST-005 — Subagents, plan mode, review per PR

- **Owner:** TrungNguyen

## Goal

The parts of the Build and Deploy stages that the harness had as sentences become files: a verifier that runs the verification set in its own context, a reviewer that reads one disjoint area and reports PLAUSIBLE findings with `file:line`, a `REVIEW.md` the headless review runs from, and `/loops:start` beginning in plan mode (playbook lesson 4: "Claude cannot edit files until the engineer accepts the plan").

## Scope

**In:** `template/.claude/agents/verifier.md` (tools Bash, Read; runs the AGENTS.md verification set, reports, never fixes), `template/.claude/agents/reviewer.md` (tools Read, Grep, Glob; one area; PLAUSIBLE until the lead opens the line; `isolation` unset), `template/REVIEW.md`, skill edits to `start`, `land`, `review`.
**Out:** claude-code-action or the managed Code Review service (no CI runs for the only consumer). Rating findings monthly (a ritual for a team, noted in REVIEW.md as optional).

## Acceptance Criteria

```gherkin
Scenario: land attaches the review
  Given a story branch with a diff against main and REVIEW.md at the root
  When /loops:land reaches step 5
  Then it runs "git diff main... | claude -p --append-system-prompt "$(cat REVIEW.md)" --output-format json" and the PR description has a "Review (headless)" section with findings tagged by pass and severity
```

## Closing checklist

- [x] `loops-install-files.txt` lists the two agent files and REVIEW.md (managed).
- [x] proof ✅; `loops-gen`; `loops-check` OK.
