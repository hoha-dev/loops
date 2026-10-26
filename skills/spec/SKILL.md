---
name: spec
description: Design stage — write docs/specs/SPEC-nnn.md from an accepted intent, under the repo's boundaries, ADRs and skills, with every point a person has to decide registered as an OPEN row or a Proposed ADR, then stop for the product owner. Use when the user says "write the spec", "viết spec", "thiết kế từ intent này", "requirements and design for INT-nnn", "lên spec cho tính năng X", or after an intent was accepted. NOT for capturing the idea (/loops:intent), not for splitting an accepted spec into stories (write story packets), and not for propagating a settled decision (/loops:sync).
---

# /loops:spec — requirements and design in one pass, decisions flagged

The agent writes the spec; the product owner reviews it and does not write it (playbook lesson 3). The spec is accepted only when every point a person had to decide is resolved — `loops-check` enforces that, and a story traced to a draft spec is never Ready.

Requires an intent with `status: accepted` in `docs/intents/`. If it is still `draft`, say so and stop: a spec written against an unaccepted intent is rework waiting to happen.

## Step 1 — Load the constraints, not the whole repo

Read, in this order: the intent · `AGENTS.md` (boundaries, stack, guardrails) · every ADR in `docs/decisions/` with status Accepted · `docs/decisions/OPEN.md` · the product contract sections the intent names · `docs/architecture/` for the modules the change touches · the skills available in this session (the repo's own `.claude/skills/` and plugin skills: they encode the policies the spec must respect — brand, security, API conventions).

## Step 2 — Classify on both axes (FEATURE_INTAKE)

- **Authority first:** does any part force you to invent a policy, a number, a default that no product doc or ADR states? Each such point is **not yours to decide**: it becomes an `OPEN-nnn` row with your proposal.
- **Size:** will the stories be 🟢 tiny (then no spec is needed — say so), 🟡 normal, or 🔴 high-risk (touches an invariant boundary)? A 🔴 spec needs the tradeoff written as an ADR with `Status: Proposed` and a Design section deep enough for an independent reviewer.

## Step 3 — Write the spec

Create `docs/specs/SPEC-nnn-<slug>.md` from `docs/templates/spec.md`; the id, and every `OPEN-nnn` / `ADR-nnnn` filed below, comes from `node scripts/loops-gen.mjs --next-id SPEC|OPEN|ADR` after a `git fetch` (it counts main, every branch and the working tree — ADR-0007). Fill every section; the one that matters most is **Points a person has to decide**:

- a policy / number / default → `OPEN-nnn` row in `docs/decisions/OPEN.md` (today's date, your proposal, "Blocks: SPEC-nnn"); list the id under `opens`.
- an architectural tradeoff → new `docs/decisions/ADR-nnnn-<slug>.md` from `docs/templates/decision.md` with `Status: Proposed`, options and your recommendation; list it under `adrs`. Fill `Settles before:` with the spec id.
- a conflict between two existing rules → name both lines, propose which wins; that is an OPEN row too.

If there is truly nothing to decide, the section says `none` — never delete it.

Out of scope has two kinds, kept apart: "another spec/story takes it" (name it) and "not needed because X" (write X so a reviewer can check the claim; LESSONS L29).

Proof: list the observable behaviours that will become `proof` rows of the stories.

## Step 4 — Register and verify

1. Add the spec id to the intent's `spec:` list.
2. `node scripts/loops-gen.mjs && node scripts/loops-check.mjs` — the check reads the new front matter; fix what it reports.
3. Do **not** write story packets and do not flip `status: accepted`.

## Output shape

```
Wrote docs/specs/SPEC-nnn-<slug>.md (draft) from INT-nnn
Behaviour: <one line>
Points a person has to decide: OPEN-nnn <q> · ADR-nnnn (Proposed) <tradeoff>   (or "none")
Boundaries touched: <from AGENTS.md, or "none">
Next: the product owner settles the points (one sitting: OPEN.md + the Proposed ADRs), runs /loops:sync,
      then sets status: accepted — only then are stories split from it.
```

Reply in the user's language. Keep the message under 15 lines; the spec is the deliverable.

## Scale

An intent with one obvious design gets a one-screen spec: problem, behaviour, constraints applied, "Points: none", proof. The full ceremony (rejected options, Proposed ADR, flow diagram) is for 🔴 work.
