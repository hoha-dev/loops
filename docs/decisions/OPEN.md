# docs/decisions/OPEN.md — Decision queue awaiting a human

> One place for every question an agent has no authority to answer (FEATURE_INTAKE, authority axis). The agent **adds a row**, the human **decides**, the agent **records the decision where it belongs** and flips the status. A story that still references an unresolved OPEN is not Ready — `loops-check` enforces that.

## Why questions do not live inside stories

Questions scattered across story files force the PO to open each file to find them, and a 🔴 story can say "Ready" while an OPEN further down blocks implementation (it happened: project B baseline review 2026-08-15, F1). One table: the PO answers in one sitting, several stories unlock at once.

## Conventions

- IDs `OPEN-nnn`, sequential, never reused.
- **Opened** (`YYYY-MM-DD`) is mandatory. Without it nobody can see how long a question has been waiting — `loops-check` reads this column and reports rows waiting over 30 days. An old question never speaks up on its own.
- **Proposal** is mandatory: the agent offers an option with a one-line reason; the human only needs to say "agreed" or amend. A question without a proposal pushes the thinking back onto the human.
- A proposal carrying a deadline ("if this runs past 30 days, do X") needs someone who owns that deadline. A self-imposed trigger that passes with nobody acting is worse than no trigger: it leaves everyone believing a plan exists.
- **Blocks** names the story and land waiting (`ST-018 land 2`), so the human can see which answer unlocks the most.
- When decided: flip `open` → `closed`, fill **Recorded at** (a new ADR, a doc changelog entry, or the story itself) — the decision lives there, not in this table. Then remove the ID from the story's `opens`.
- This table is a queue, not an archive: `closed` rows are deleted at the next cross-review (the review snapshot keeps the history).

## Queue

| ID | Opened | Question | Agent's proposal | Blocks | Status | Recorded at |
| --- | --- | --- | --- | --- | --- | --- |
| OPEN-002 | 2026-10-06 | Stored-base three-way update (INT-002 row 1): build it before project B migrates, or migrate by hand first? | Build it first; the project B migration is its first real run and becomes a fixture | INT-002 | closed | ADR-0005, SPEC-002 |
| OPEN-003 | 2026-10-06 | Boundary without `Enforced by:` in its ADR (INT-002 row 2): loops-check fails or notes? | Note (L28: time-axis and adoption signals are notes); failing would turn every existing consumer red on upgrade | INT-002 | closed | ADR-0006 |
| OPEN-004 | 2026-10-06 | `evals/skills/encode.json` caps cost at 4 USD (a guess); the smoke run of 2026-10-06 triggered the skill, passed the three content checks and cost 4.09 USD in logged-in mode (no `ANTHROPIC_API_KEY`, so the machine's CLAUDE.md was loaded). Raise the cap, or run the evals with `--bare`? | Run the suite once with `ANTHROPIC_API_KEY` set (`--bare`) before touching the cap; if `--bare` still exceeds 4 USD, set the cap to the measured value + 25 %. Not raised here: a cap changed to go green is the guardrail's own example | evals/last-run.md (0/1) | open | |
| OPEN-005 | 2026-10-14 | Add an HTML viewer to loops? Scope (a): loops-owned data — stories by status, open OPEN rows, Proposed ADRs — e.g. `loops-gen --html`. Scope (b): the product backlog (`US-x.y` in `docs/product/`), which loops does not format today. Evidence so far: one consumer (project C) built (b) as a repo script, `scripts/backlog-html.mjs` (135 lines + a 125-line page template, review checkboxes + notes in localStorage, `--check` on pre-push); one PO review, 2 notes. | Decide after project C sprint 2, together with the US-trace check (aidlc idea #1): (b) needs a fixed `backlog.md` format first, which is that same decision. (a) needs no new format; take it if project C shows people opening the story table often. | — | open | |
