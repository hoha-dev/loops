---
name: intent
description: Plan stage — turn an idea, a ticket or an incident into a committed docs/intents/INT-nnn.md through a short design dialogue, with every question the originator cannot answer filed as a docs/decisions/OPEN.md row. Use when the user says "I have an idea", "let's think through X", "bàn / thảo luận / brainstorm", "ghi lại ý định", "viết intent", "capture this as intent", or whenever a non-trivial change has no accepted intent yet. NOT for packaging work that already has an accepted spec (write a story packet), not for choosing what to do next (/loops:next), and not when the user only asks how existing code works.
---

# /loops:intent — a dialogue that ends in a file

The first committed artifact of the loop is `intent.md`: what is wanted, why, and under which constraints, in the originator's own words, before anyone decides how (playbook lesson 2). The dialogue below exists to get there; the file is the deliverable, and the product owner's acceptance of it is what starts `/loops:spec`.

## Core gate

**No code, no scaffolding, no edits toward a solution until the intent is accepted.** Reading the repo to understand it is fine; building is not.

## Step 1 — Read before asking

Open what the repo already says: `AGENTS.md`, `docs/product/`, `docs/decisions/` (ADRs and `OPEN.md`), the intents already in `docs/intents/`, recent commits. Do not ask what the files can tell you.

## Step 2 — Size the request

If it spans several independent subsystems, say so and split: each independent piece gets its own intent. Do not refine details of a request that first needs decomposing.

## Step 3 — Ask, two modes

- **Decisions (real forks):** one at a time, multiple choice where possible (AskUserQuestion). Each option carries the data that decides it and the cost of being wrong.
- **Factual gaps:** invite an info-dump, or batch 5–10 numbered questions answerable in shorthand.

Aim at the four things the intent template needs: the problem (who, how often, a number with its source), the outcome as the user would see it, the constraints, and what is out of scope. Stop when you could ask about edge cases without having basics explained.

## Step 4 — Find the real fork, then propose

Often the decision the user states is not the one that matters ("this is a documentation change, not an architecture change"). Name the true decision. Where the intent implies a choice of approach, give 2–3 options with trade-offs and a recommendation with its one-line reason. Keep the options out of the intent file: the intent says what and why; `/loops:spec` decides how.

## Step 5 — Write the file

Create `docs/intents/INT-nnn-<slug>.md` from `docs/templates/intent.md`. The id comes from `node scripts/loops-gen.mjs --next-id INT` after a `git fetch`: it counts main, every branch and the working tree, so two developers do not both write INT-003 (ADR-0007; never reuse an id). OPEN rows get theirs from `--next-id OPEN` the same way. Front matter: `status: draft`, `source: idea | ticket:<id> | incident:<id> | metric:<name>`, `opened: <today, absolute>`.

Every question the originator could not answer becomes **one row in `docs/decisions/OPEN.md`** now, with a proposal and today's date in the "Opened" column; the intent's "Open questions" section lists those ids. A question without a proposal pushes the thinking onto the human; write the proposal.

Never write a `DECISIONS.md`, a design doc, or a story packet from this skill.

## Step 6 — Self-review, then hand over

Read the file as a stranger: no "TBD", no two readings of one sentence, no option list where a statement belongs. Fix inline. For a high-stakes intent, hand only the file to a fresh subagent and ask what an implementer would ask; rewrite what it flags.

Report in the user's language:

```
Wrote docs/intents/INT-nnn-<slug>.md (draft)
Problem: <one line>  ·  Outcome: <one line>
Open questions filed: OPEN-nnn <q> · OPEN-nnn <q>   (or "none")
Next: the product owner sets status: accepted, then /loops:spec INT-nnn
```

Do not accept the intent yourself; acceptance is the product owner's commit.

## Principles kept from the dialogue this skill replaced

One question per message, multiple choice preferred. YAGNI: cut what the user did not ask for. Always a recommendation, never a bare survey. State assumptions and the cost of being wrong. Respect the existing codebase's patterns. Scale the ceremony to the stakes: a small change gets a short dialogue and a short intent.
