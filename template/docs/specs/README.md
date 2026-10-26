# docs/specs — Requirements and design (Design stage)

> One spec per accepted intent, written by the agent under the repo's rules (AGENTS.md boundaries, ADRs, skills) with every point a person has to decide flagged. The product owner reviews it and does not write it. An accepted spec is what story packets are split from.

## Conventions

- **IDs:** `SPEC-nnn`, sequential. File name `SPEC-nnn-<slug>.md`, front matter from [`../templates/spec.md`](../templates/spec.md).
- **Status** `draft` → `accepted` (`accepted_by`, `accepted_on` filled). A story whose `trace:` names a `draft` spec is not Ready; `loops-check` says which spec.
- **Points a person has to decide** is mandatory. Each point is an `OPEN-nnn` row (policy, number, default) or an ADR with status `Proposed` (tradeoff). The spec lists them in `opens` / `adrs`; it is accepted only when `opens` is empty and every ADR in `adrs` is `Accepted`. A Proposed ADR blocks Ready of every high-risk story that inherits it.
- Written with `/loops:spec`; decisions are propagated with `/loops:sync` once the PO has settled them.

## Measure (from the playbook)

Leading: time between the intent commit and the spec commit. Lagging: spec commits dated after the first story of that spec went in progress (requirements rework after build started).
