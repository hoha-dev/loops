---
id: SPEC-XXX
title: Short name of the feature
intent: INT-XXX            # the accepted intent this spec answers
status: draft              # draft | accepted  — only an accepted spec may be split into stories (loops-check verifies)
accepted_by:               # product owner (plus the tech lead for high-risk) — filled when status flips
accepted_on:
adrs: []                   # decisions this spec needs; a Proposed ADR here blocks Ready of every story that inherits it
opens: []                  # OPEN-nnn rows raised by this spec; non-empty = not accepted yet
---

# Spec: SPEC-XXX — Short name

<!-- Written by the agent from the accepted intent, under the repo's rules (AGENTS.md boundaries, ADRs,
     skills), with every point a person has to decide flagged. The product owner reviews it and does not
     write it. Accepting it is what starts story splitting. -->

## Problem and users

[From the intent. Persona from the product contract.]

## Proposed behaviour

[What the system will do, as observable behaviour. States: loading / empty / error / offline / success.]

## Main flow

[Step 1 → 2 → 3, or a Mermaid diagram.]

## Constraints applied

[Which AGENTS.md boundaries, ADRs and skills constrained this spec, and how.]

## Points a person has to decide

<!-- Mandatory; may not be empty unless it says "none". Each point is one of:
     - a row in docs/decisions/OPEN.md (a policy, number or default nobody has decided) — list the id in `opens`
     - a new ADR with status Proposed (an architectural tradeoff) — list the id in `adrs`
     - a conflict between two existing rules — name both, propose which wins
     The spec is accepted only when every point here is resolved. -->

- OPEN-nnn — [question] — proposal: [one line]
- ADR-nnnn (Proposed) — [tradeoff] — proposal: [one line]

## Out of scope

[Two kinds, kept apart: "another story takes it" (name it) and "not needed because X" (write X so it can be checked).]

## Proof

[How we will know it works: the behaviours that become `proof` rows in the stories.]
