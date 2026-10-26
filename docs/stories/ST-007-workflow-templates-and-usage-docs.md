---
id: ST-007
title: CI workflow templates, the WORKFLOW doc, README usage, and the migration note for a repo on the predecessor harness
trace: SPEC-001 §Proposed behaviour, playbook lessons 12 and 14
class: normal
status: done
depends_on: [ST-002, ST-003, ST-004, ST-005, ST-006]
consumes: []
owns: [README.md, docs/WORKFLOW.md, docs/product/**, docs/architecture/**, template/ci/**, skills/init/**, skills/update/**, loops-install-files.txt]
opens: []
adrs: [ADR-0002, ADR-0003]
proof:
  - T-DOC-5 | manual | README.md installs the plugin in three commands and shows one full loop (intent → spec → wave → start → land → review) with the command for each step | ✅
  - T-DOC-6 | manual | docs/WORKFLOW.md walks the six stages, naming for each the artifact, the skill, the gate (hook / check / human), and the playbook lesson it comes from | ✅
  - T-CI-3 | manual | template/ci/github-loops.yml and template/ci/gitlab-ci.yml call loops-gen --check and loops-check on every push, and the evals on changes under .claude/** and skills; neither has continue-on-error | ✅
  - T-SKL-8 | manual | /loops:update recognises a repo on the predecessor harness (HARNESS: markers, HARNESS.md) and migrates markers, file names and the invoker before diffing | ✅
---

# Story Packet: ST-007 — Workflow templates and usage docs

- **Owner:** TrungNguyen

## Goal

Someone who has never seen the predecessor harness can install loops and run one loop end to end from the README; a team's CI gets the two gates the playbook's Deploy stage asks for from a template; project B migrates with `/loops:update`.

## Scope

**In:** `README.md` (what, install, one loop, the skills table, what is enforced where), `docs/WORKFLOW.md`, `docs/product/PLAYBOOK.md` (the product contract: the playbook summary this repo implements, with lesson numbers), `docs/architecture/DESIGN.md` (how the pieces fit), `template/ci/` (GitHub Actions + GitLab CI), `/loops:init` and `/loops:update` updated for the new files and the migration path.
**Out:** HOW-IT-WORKS HTML page (the old repo's generator is not ported; WORKFLOW.md is the replacement). Running any CI here.

## Acceptance Criteria

```gherkin
Scenario: a reader runs one loop from the README
  Given a fresh repo with the plugin installed
  When the reader follows README "One loop" top to bottom
  Then each step names the command, the file it writes, and the check that proves it, and the last step is loops-check OK
```

## Closing checklist

- [x] Every relative link in README and WORKFLOW resolves (checked with a script in the PR).
- [x] proof ✅; `loops-gen`; `loops-check` OK.
