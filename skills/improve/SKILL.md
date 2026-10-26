---
name: improve
description: Improve the harness itself (template, skills, hooks, checks, AGENTS/FEATURE_INTAKE conventions) as a controlled experiment on file, not from vibes — reproduce a real failure, find the earliest gap, state a falsifiable hypothesis with what would weaken it and when to remove the change, rerun with a fresh agent, and keep only with a verdict. Use when the user says the harness "didn't work", an agent misbehaved despite the docs, a lesson should change the harness, or "cải tiến harness". NOT for reviewing a project milestone (/loops:review), bootstrapping (/loops:init), or encoding one boundary of a consuming repo (/loops:encode).
---

# /loops:improve — harness changes as experiments on file

A harness edit made from vibes usually adds a bullet nobody reads. This skill forces the loop and writes it down: evidence → earliest gap → owner → hypothesis with its weakening evidence and removal condition → minimal change → fresh rerun → verdict. The record is one snapshot per experiment, `docs/reviews/YYYY-MM-DD-improve-<slug>.md`, from `docs/templates/improvement.md`; the file exists before the change is made, and the verdict is the last thing written into it.

## Step 1 — Baseline: reproduce the failure (template §1–2)

Capture the concrete case: the job, what the agent did, what it should have done, and the transcript / diff / commit proving it. No baseline → stop and ask for the failing example. Open the snapshot file now with §1 and §2 filled.

## Step 2 — Locate the EARLIEST gap (§3) and its owner (§4)

Walk the flow the agent actually took (CLAUDE.md → AGENTS.md → intake → story → hooks → …) and find the **first** point where the harness could have prevented the failure; name the file and the exact spot, and classify the gap (Context · Capability · Domain ownership · Authority · Proof · Environment). Then the layer that should own the fix: hook, check, prose, skill, template, or the consuming repo's own docs — a rule a hook can enforce goes to a hook, never to a sentence (ADR-0004).

## Step 3 — Hypothesis (§5)

One sentence: **"If X (the change) at Y (the spot) then a fresh agent will Z (the behaviour) because M (the mechanism)."** Then the two lines that keep it honest, written before the change:

- **Evidence that would weaken this** — what the rerun shows if you are wrong. If you cannot say it, the change is decoration; do not make it.
- **Maintenance owner and removal condition** — who keeps the change and which observation means it should go ("no block from this hook in 90 days", "the eval passes without it"). Every kept change in loops has one, hooks and checks included.

## Step 4 — Implement the minimal change

The smallest edit that tests the hypothesis. Respect the entrypoint budget (`loops-check` item 4): a new AGENTS.md bullet names the bullet it replaces. Prefer executable checks over prose (L8).

## Step 5 — Fresh rerun (§6), then the verdict (§7)

Re-run the baseline with a **fresh session that exercises the changed path**: an eval phrasing under `evals/skills/<skill>.json` then `bash evals/run.sh <name>` (result and cost land in `evals/last-run.md`); a hook change gets a fixture in `test/hooks.mjs`; a check change one in `test/run.mjs`. Fill §6 with what ran, whether it was fresh, whether it hit the change, the result and the cost. A rerun that did not hit the changed path decides nothing; say so and rerun.

- **Keep** → LESSONS.md gets the next L-number, pointing at the snapshot; the removal condition goes with it.
- **Revise** → a new hypothesis means a new snapshot; this one ends with "Revise → see <next file>".
- **Remove** → revert the change in the same commit as the verdict. A kept-but-unproven edit is entropy.

The snapshot is never edited after its verdict. Reply in the user's language.
