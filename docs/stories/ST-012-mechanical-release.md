---
id: ST-012
title: CHANGELOG, a release check, version 0.2.0, and the docs that describe v0.2
trace: SPEC-002 row 5, INT-002 row 5
class: normal
status: done
depends_on: [ST-008, ST-009, ST-010, ST-011]
consumes: []
owns: [CHANGELOG.md, test/release.mjs, .claude-plugin/plugin.json, README.md, docs/WORKFLOW.md, docs/architecture/DESIGN.md, docs/LOOP.md, AGENTS.md, template/ci/**]
opens: []
adrs: []
proof:
  - T-REL-1 | unit | test/release.mjs fails when CHANGELOG.md's first entry, .claude-plugin/plugin.json version and the root docs/LOOP.md LOOPS_VERSION disagree, and passes on this repo | ✅
  - T-REL-2 | unit | test/release.mjs fails when a diff against the upstream ref touches template/, skills/ or loops-install-files.txt while plugin.json version is unchanged; without an upstream ref it prints that the comparison was skipped | ✅
  - T-DOC-7 | manual | README, WORKFLOW and DESIGN describe /loops:encode, loops-update, the four enforcement levels and the several-developers rules, with the test counts of this run | ✅
---

# Story Packet: ST-012 — Mechanical release

- **Owner:** TrungNguyen

## Goal

A change to what consumers receive cannot ship without a version bump and a CHANGELOG line (repository-harness `post-merge-maintenance.yml` as the model, without a binary or tags).

## Scope

**In:** `CHANGELOG.md`, `test/release.mjs` in `.githooks/pre-push`, version 0.2.0 in `plugin.json`, the root `docs/LOOP.md` and `.loops/manifest.json` (by running the updater on this repo), README/WORKFLOW/DESIGN/AGENTS updates.
**Out:** tags, release assets, a self-update binary (INT-002 out of scope). The CI templates do not run `test/release.mjs`: a consuming repo has no `plugin.json`, so the release contract is this repo's alone (its invoker is `.githooks/pre-push`).

## Closing checklist

- [x] proof ✅; `loops-gen`; `loops-check` OK. `node scripts/loops-update.mjs apply --plugin .` ran on this repo for real: 2 files updated (`docs/templates/decision.md`, the `core` block of `docs/LOOP.md`), 9 frozen, 0 conflicts, manifest 0.1.0 → 0.2.0.
