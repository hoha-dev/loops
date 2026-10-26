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
