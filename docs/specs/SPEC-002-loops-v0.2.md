---
id: SPEC-002
title: loops v0.2 — stored-base update, encoded boundaries, honest enforcement levels, improvement experiments, several developers, mechanical releases
intent: INT-002
status: accepted
accepted_by: TrungNguyen (PO + tech lead)
accepted_on: 2026-10-06
adrs: [ADR-0005, ADR-0006, ADR-0007]
opens: []
---

# Spec: SPEC-002 — loops v0.2

## Problem and users

See INT-002. The owner; project B as the first repo to migrate with the new updater; a second developer on any loops-managed repo (row 9).

## Proposed behaviour

| INT-002 row | Story | What changes |
| --- | --- | --- |
| 1 | ST-008 | `scripts/loops-update.mjs` (`init`, `status`, `apply`, `--continue`, `--abort`) with `.loops/manifest.json` + `.loops/base/`; `/loops:init` records the base; `/loops:update` drives the script and resolves staged conflicts; `loops-check` item 14 notes managed-file drift and a manifest/version mismatch. |
| 2, 3, 6 | ST-009 | `/loops:encode`; `Enforced by:` in `docs/templates/decision.md`, parsed by `loops-gen`; `loops-check` item 5b (note); item 9 and the land PR template reworded to the four levels; `/loops:init` produces the invariant-vs-check inventory; `/loops:review` Step 2 starts from the `Enforced by` table; `adr-guard` allows editing the `Enforced by` line on an Accepted ADR. |
| 4 | ST-010 | `docs/templates/improvement.md`; `/loops:improve` writes `docs/reviews/YYYY-MM-DD-improve-<slug>.md` and names a removal condition for every kept change. |
| 9 | ST-011 | `loops-gen --claims --fetch`, `--next-id`; `loops-check` item 15 (duplicate ids fail, stale fetch note); `/loops:start` pushes the claim; `/loops:wave`, `/loops:next`, `/loops:intent`, `/loops:spec` fetch and allocate with the tool; `owns-guard` narrowed; LOOP.md "Several developers". |
| 5 | ST-012 | `CHANGELOG.md`; `test/release.mjs` (CHANGELOG head = plugin version = root `LOOPS_VERSION`; a change under `template/`, `skills/` or the manifest needs a version bump when an upstream exists to compare with); version 0.2.0; README, WORKFLOW, DESIGN updated. |

## Main flow (what changes for a consumer)

```
/loops:init   → writes .loops/manifest.json + .loops/base/, the inventory table, ADRs with "Enforced by:"
/loops:update → node scripts/loops-update.mjs apply --plugin <dir>  → clean: done · conflicts: .loops/update/, exit 2
              → resolve .loops/update/resolved/<path> → --continue
/loops:start  → branch created, pushed, then plan mode (ADR-0007)
/loops:wave   → fetch, then the disjoint Ready set, minus what any developer has claimed
/loops:encode → a boundary gets its check, its negative proof and its "Enforced by:" line
/loops:improve→ one experiment file per change, kept only with a removal condition
```

## Constraints applied

ADR-0001…0004 as before. ADR-0005 (update), ADR-0006 (enforcement), ADR-0007 (claims across developers). Plain node + git; no Python, no Rust (INT-002 constraints).

## Points a person has to decide

- OPEN-002 — build the updater before migrating project B. Resolved 2026-10-06: yes (ADR-0005).
- OPEN-003 — missing `Enforced by:` fails or notes. Resolved 2026-10-06: notes (ADR-0006).
- ADR-0005, ADR-0006, ADR-0007: Accepted 2026-10-06 in the same sitting.

## Out of scope

- The evidence capsule, engineering-wisdom, explicit-only skills, the Rust binary (INT-002 "Out of scope", with the reasons there).
- Running `/loops:update` on project B: a separate session on that repo; its result becomes the first fixture from a real repo (OPEN-002's proposal).
- An `assignee:` field (ADR-0007 rejected options).

## Proof

- `test/update.mjs`: a clean upstream change is applied; a non-overlapping local edit survives; an overlapping edit stages a conflict and leaves the live file untouched; `--continue` refuses markers; a mixed file keeps the bytes outside its markers; a frozen file is skipped.
- `test/run.mjs`: a boundary ADR without `Enforced by:` notes and with it does not; duplicate ids fail; a stale fetch notes.
- `test/hooks.mjs`: `owns-guard` blocks an existing ADR of another story and allows a new ADR and `OPEN.md`; `adr-guard` allows the `Enforced by` line on an Accepted ADR.
- `test/release.mjs`: version and CHANGELOG agree on this repo.
