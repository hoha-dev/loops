# Improvement — [one line: what was changed in the harness and why]

> Date: YYYY-MM-DD · Owner: [who runs the rerun and owns the removal condition] · Scope: [files of the harness touched]
> Snapshot: written once by `/loops:improve`, never edited afterwards. Lives in `docs/reviews/YYYY-MM-DD-improve-<slug>.md`.

## 1. Representative job

[The real task an agent was given. One paragraph, with the session or commit it comes from. Not a hypothetical.]

## 2. Baseline (what happened without the change)

[What the agent did, what it should have done, and the transcript / diff / commit that proves it. No baseline = nothing to improve.]

## 3. Earliest gap

| Kind | One of: Context (the agent could not know) · Capability (it knew and could not do) · Domain ownership (nobody owned the rule) · Authority (nobody had decided) · Proof (it claimed without evidence) · Environment (the tool or runtime failed) |
| --- | --- |
| Where | [file and the exact spot — the **first** point the harness could have prevented the failure; fixing a later symptom moves the failure] |
| Why this is the earliest | |

## 4. Correct owner of the fix

[Which layer: hook · check · prose · skill · template · the consuming repo's own docs. A rule that gets a hook loses its sentence (ADR-0004).]

## 5. Hypothesis

**If** [X, the change] **at** [Y, the spot] **then a fresh agent will** [Z, the behaviour] **because** [M, the mechanism].

- **Evidence that would weaken this:** [what the rerun would show if the hypothesis is wrong]
- **Maintenance owner and removal condition:** [who keeps it, and the observation that means it should be removed — "no block in 90 days", "the eval passes without it", "the consumer repo no longer has the path"]

## 6. Fresh rerun

| What ran | Fresh session? | Hit the changed path? | Result | Cost |
| --- | --- | --- | --- | --- |
| `bash evals/run.sh <name>` / `node test/hooks.mjs` / … | yes/no | yes/no | | |

[Paste the lines that decide it. A rerun that did not hit the changed path decides nothing.]

## 7. Verdict

**Keep** / **Revise** / **Remove** — [one sentence]. Keep → LESSONS.md gets its L-number pointing here. Revise → a new hypothesis, a new file. Remove → the change is reverted in the same commit as this verdict; a kept-but-unproven edit is entropy.
