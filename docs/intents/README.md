# docs/intents — Captured intent (Plan stage)

> The first committed artifact of the loop. A person with an idea, a ticket, or an incident writes what is wanted, why, and under which constraints — in their own words, before anyone decides how. The product owner accepts it; acceptance is what starts the spec pass.

## Conventions

- **IDs:** `INT-nnn`, sequential, never reused. File name `INT-nnn-<slug>.md`, front matter from [`../templates/intent.md`](../templates/intent.md).
- **Status** lives in the front matter: `draft` → `accepted` (by the product owner) or `closed` (not pursued). The accept/close decision is the commit that flips it.
- **Questions the originator cannot answer** become rows in [`../decisions/OPEN.md`](../decisions/OPEN.md) at this stage, with a proposal each — not after a story exists.
- **One intent, zero or more specs** (`spec:` in the front matter). A story traces to a spec, a spec traces to an intent; `loops-check` follows the chain.
- Written with `/loops:intent`, which ends the design dialogue by writing this file instead of a decisions log.

## Measure (from the playbook)

Leading: time from the first conversation to the committed intent (git history). Lagging: the share of intents accepted into a spec rather than closed, and edits to an intent after its first spec was committed.
