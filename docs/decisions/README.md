# docs/decisions — Architecture Decision Records (ADR)

> Durable decisions that future agents must inherit. **Never edit an old ADR** — to change one, create a new ADR with `Supersedes: ADR-XXXX`.

## Status is a gate

`- **Status:** Proposed | Accepted | Superseded` is read by `loops-gen`. A **Proposed** ADR blocks Ready of every high-risk story that lists it under `adrs:` (a normal story only gets a note), and an accepted spec may not list one. An ADR with no Status line counts as Proposed. Settle ADRs together with the `OPEN.md` rows, in one sitting, before build: `/loops:sync` flips the status and propagates the decision.

## Index

| ADR  | Title | Status |
| ---- | ----- | ------ |
| [ADR-0001](ADR-0001-one-english-template.md) | One canonical template, written in English | Accepted |
| [ADR-0002](ADR-0002-template-is-payload-root-is-dogfood.md) | `template/` is the payload; the repo root runs it on itself | Accepted |
| [ADR-0003](ADR-0003-plugin-only-skills.md) | Skills are installed only as a plugin and named by the stage verb | Accepted |
| [ADR-0004](ADR-0004-hooks-are-the-deterministic-layer.md) | Every boundary a hook can enforce is a hook | Accepted |
| [ADR-0005](ADR-0005-update-merges-over-a-stored-base.md) | `/loops:update` is a three-way merge over a stored base | Accepted |
| [ADR-0006](ADR-0006-a-boundary-names-its-enforcement.md) | A boundary's ADR names what enforces it; four enforcement levels reported apart | Accepted |
| [ADR-0007](ADR-0007-a-claim-is-a-pushed-branch.md) | Across developers, a claim is a pushed branch and an id is allocated after a fetch | Accepted |

## Drift notes (pressure valve — never edit ADR bodies)

> When reality overtakes part of an ADR (scope cut, re-measured numbers, a mechanism deferred) but it
> doesn't yet warrant a superseding ADR, note it here: one paragraph per ADR, stating which part
> narrowed and why, so agents/devs don't implement something that is already dead. A note disappears
> when its ADR is actually superseded.

- **ADR-0004 (2026-10-06):** the Context says "exit 2 blocks the call and sends stderr to the agent; a JSON `permissionDecision: deny` does the same", and that "both forms run on this machine with node". Both forms do run, but only the JSON form blocks on Windows: Claude Code runs hook commands under PowerShell there, which reports a native command's non-zero exit as status 1, and a hook that errored never blocks (measured in a `claude -p` session, 2.1.290). Every hook now blocks with the JSON form (`lib.mjs` `block()` calls `deny()`), and `.claude/settings.json` writes `${CLAUDE_PROJECT_DIR}` with braces because `$CLAUDE_PROJECT_DIR` is `$null` in PowerShell. The decision (hooks are the deterministic layer) stands; the mechanism named in the Context narrowed to one of its two forms. Lesson L37.

## Template

Use [`../templates/decision.md`](../templates/decision.md) when adding a new ADR.
