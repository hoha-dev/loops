# docs/decisions — Architecture Decision Records (ADR)

> Durable decisions that future agents must inherit. **Never edit an old ADR** — to change one, create a new ADR with `Supersedes: ADR-XXXX`.

## Status is a gate

`- **Status:** Proposed | Accepted | Superseded` is read by `loops-gen`. A **Proposed** ADR blocks Ready of every high-risk story that lists it under `adrs:` (a normal story only gets a note), and an accepted spec may not list one. An ADR with no Status line counts as Proposed. Settle ADRs together with the `OPEN.md` rows, in one sitting, before build: `/loops:sync` flips the status and propagates the decision.

## Enforced by

An ADR that backs an AGENTS.md boundary also carries `- **Enforced by:**` — the check, hook or test that holds the rule (with the ids of its positive and negative proof), or `none yet — prose only`. `loops-check` notes a boundary ADR without the line; `/loops:encode <boundary>` adds the smallest check and fills it. The line is header metadata and may be updated on an Accepted ADR (`adr-guard` allows it); the body may not.

## Index

| ADR  | Title | Status |
| ---- | ----- | ------ |
|      |       |        |

## Drift notes (pressure valve — never edit ADR bodies)

> When reality overtakes part of an ADR (scope cut, re-measured numbers, a mechanism deferred) but it
> doesn't yet warrant a superseding ADR, note it here: one paragraph per ADR, stating which part
> narrowed and why, so agents/devs don't implement something that is already dead. A note disappears
> when its ADR is actually superseded.

## Template

Use [`../templates/decision.md`](../templates/decision.md) when adding a new ADR.
