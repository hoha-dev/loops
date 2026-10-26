---
id: ST-003
title: ADRs are settled before a high-risk story is Ready — status gating, Proposed ADRs in the queue, the sync skill
trace: SPEC-001 §Main flow, INT-001 (ADRs 12–18 days late on project B)
class: high-risk
status: done
depends_on: [ST-001]
consumes: []
owns: [template/docs/templates/decision.md, template/docs/decisions/**, skills/sync/**, skills/wave/**, template/scripts/loops-gen.mjs, template/scripts/loops-check.mjs, test/run.mjs]
opens: []
adrs: [ADR-0004]
proof:
  - T-CORE-4 | unit | A high-risk story whose adrs list contains an ADR with status Proposed is not Ready; the backlog's Blocked by column names the ADR | ✅
  - T-CORE-5 | unit | A normal story with a Proposed ADR gets a note, not a failure | ✅
  - T-CORE-6 | unit | An ADR file without a Status line is treated as Proposed and the check says so | ✅
  - T-SKL-3 | manual | /loops:wave lists Proposed ADRs next to open OPEN rows in its "one PO sitting would unlock" paragraph | ✅
---

# Story Packet: ST-003 — ADRs settled before Ready

- **Owner:** TrungNguyen

## Goal

"Write the ADR first" stops being a sentence. A high-risk story is Ready only when every ADR it inherits is `Accepted`; a `Proposed` ADR behaves like an open question in the queue, so the product owner settles ADRs and OPEN rows in one sitting, before build (measured on project B: ADR-0012/13/14 landed 12 and 18 days after the stories that needed them had started).

## Scope

**In:** `loops-gen` reads `- **Status:** Proposed|Accepted|Superseded` from each ADR; `evaluate()` treats a Proposed ADR as a blocker for `class: high-risk` and a note for `normal`; `templates/decision.md` gains `Settles before: [ST-nnn]`; `decisions/README.md` explains the gate; `/loops:wave` step 3 lists Proposed ADRs; `/loops:sync` (from project B's `h-decision-sync`) propagates an accepted decision through every doc that asserts the old state and flips the ADR to Accepted.
**Out:** the `adr-guard` hook that protects Accepted ADR bodies (ST-004).

## Boundaries touched

`template/scripts/*.mjs`. Story front matter unchanged (`adrs:` already exists).

## Acceptance Criteria

```gherkin
Scenario: a Proposed ADR blocks a high-risk story
  Given ADR-0009 with Status Proposed and ST-020 (class high-risk, adrs [ADR-0009], status ready)
  When loops-gen and loops-check run
  Then the backlog shows ST-020 blocked by "ADR-0009 not Accepted" and loops-check fails

Scenario: the same ADR only notes a normal story
  Given ST-021 (class normal, adrs [ADR-0009], status ready)
  When loops-check runs
  Then it prints a note naming ADR-0009 and exits 0
```

## Closing checklist

- [x] Three fixture cases; `/loops:sync` ends with `loops-check` OK.
- [x] The old "needs a new ADR" sentence in FEATURE_INTAKE 🔴 now points at the gate instead of asking.
- [x] proof ✅; `loops-gen`; `loops-check` OK.
