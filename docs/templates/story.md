---
id: ST-XXX
title: Short story name
trace: US-x.y, SAD §n
class: normal            # normal | high-risk  (FEATURE_INTAKE 🟡 / 🔴)
status: draft            # draft | ready | in-progress | done  — the SINGLE SOURCE of status
depends_on: []           # stories that must be done first: [ST-002, ST-003]
consumes: []             # contracts that must exist on main before starting: [packages/api-spec/openapi.yaml]
owns: []                 # globs this story MAY edit: [apps/api/src/stats/**]. Two active stories must not overlap
opens: []                # unresolved questions in docs/decisions/OPEN.md: [OPEN-003]. Non-empty = not Ready
adrs: []                 # ADRs this story inherits: [ADR-0002, ADR-0004]
proof:                   # one line each: "T-DOM-n | kind | behavior [| ☐/🟡/✅]" — TEST_MATRIX is generated from this. Put the id (T-DOM-n) in the test title so the test can be found
  - T-XXX-1 | unit | A verifiable behavior, written as one assertive sentence
---

# Story Packet: ST-XXX — Short name

<!-- The front matter above is the MACHINE-READABLE layer: loops-check verifies Ready/Done and detects
     overlapping owns; loops-gen renders the backlog and TEST_MATRIX from it. The body is the contract
     humans and agents read. Budget: 250 lines. Acceptance logs ("ran it, saw X") do NOT get appended here —
     they go to the PR description or docs/reviews/. The packet freezes at status = ready; after that only
     status/proof change. -->

- **Owner:**

## Goal

[1-2 sentences: what the user gains. Quoted from the user story/requirement.]

## Scope

**In:** [concrete bullets]
**Out:** [what this story does NOT do — including what another story will take, naming that story]

<!-- Exclusions come in two kinds; do not blur them:
     "another story takes it"  → a hand-off; naming the story is enough.
     "not needed because <X>"  → this is an ENGINEERING CLAIM, and it is being written so that no
                                 test has to be. Nobody re-checks it afterwards, reviews included.
     For the second kind: state the reason in a checkable form ("A and B compute the same value
     because both read X"), and if you cannot state it that way it is an assumption, not a
     decision — pull it into scope or open its own story. The bug lands exactly where the story
     convinced everyone it was safe. -->

## Related boundaries (AGENTS.md)

[Which invariant boundaries does this touch? High-risk → link the related ADR / the new ADR to create (also list it under `adrs`).]

## Contract / API / Data

- Endpoint: [from the API design — if it is not on main yet, that is an unmet `consumes` and the story is not Ready]
- Table/schema: [from the DB design]
- Component/screen: [from the design handoff]

## Design (high-risk or real tradeoffs only)

[Enough that two agents would implement the same architecture. A decision that outlives the story → a short ADR, not a paragraph buried here.]

## Acceptance Criteria (Gherkin)

```gherkin
Scenario: ...
  Given ...
  When ...
  Then ...
```

## Story-closing checklist

- [ ] Every new export/module this story delivers: name the consumer importing it, or the exact story that wires it (with the wiring in that story's AC) — no call site = not done, regardless of green tests.
- [ ] Every new gate/hook/check this story delivers: name its invoker (a hook, a CI job, chained into the `test` target) in the same PR — a gate nothing invokes does not exist.
- [ ] All `proof` rows in the front matter are ✅; `node scripts/loops-gen.mjs` has run; `node scripts/loops-check.mjs` is OK.

## Lands (if the story > 1 PR)

<!-- Large stories are split into lands — each land is one mergeable PR that stands on its own (main never breaks).
     Commit messages say "(ST-xxx land N)". The first land of a story that crosses a package boundary is always the
     "contract land" (spec/types/stubs) — it is what lets dependent stories run in parallel. Delete this section if one PR suffices. -->

- **Land 1:** [scope] — [merge condition]
- **Land 2:** ...

## Implementation notes

[Technical hints, pitfalls, suggested order. Not a log.]
