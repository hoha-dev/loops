---
id: ST-017
title: Run the eval suite once and attest the manual skill proofs by a run
trace: SPEC-002 · docs/reviews/2026-10-06-v0.1-self-review.md F5 · docs/reviews/2026-10-26-v0.2-review.md F5
class: normal
status: draft
depends_on: []
consumes: []
owns: [evals/**]
opens: [OPEN-004]
adrs: []
proof:
  - T-CI-4 | unit | evals/last-run.md records a run of every evals/skills/*.json phrasing, with mode, date, pass count and cost per phrasing | ☐
---

# Story Packet: ST-017 — Run the eval suite once

- **Owner:** Trung Nguyen

## Goal

The manual proofs T-SKL-4…8 and T-DOC-4…6 are ✅ because the files read as specified; no run exercised them. The only eval run so far (2026-10-06) ran one phrasing, failed, and cost 4.09 USD. This story runs the whole suite once under OPEN-004's answer and commits the result.

## Scope

**In:** run `evals/run.sh` in the mode OPEN-004 settles; commit `evals/last-run.md`; for each failing phrasing, either fix the phrasing's expected strings (a wrong expectation) or record the skill defect as a new story.
**Out:** changing the cost cap in `evals/skills/encode.json` before the measured run — OPEN-004's own proposal.

## Story-closing checklist

- [ ] All `proof` rows ✅; `node scripts/loops-gen.mjs`; `node scripts/loops-check.mjs` OK.
