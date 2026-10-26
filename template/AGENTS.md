# AGENTS.md — {{PROJECT_NAME}}

> Stable shim for AI coding agents (Claude Code / Codex / Cursor). Read this file BEFORE touching any code.
> Full collaboration model: [`docs/LOOP.md`](docs/LOOP.md).

## What this project is

{{PROJECT_ONELINER}}
<!-- loops-init: 2-4 sentences — what the product is, for whom, and its most distinctive technical trait. No marketing copy. -->

<!-- LOOPS:BEGIN reading-order (harness-owned block — /loops:update may replace it; manual edits get merged back) -->
## Read in this order before working

1. This file (AGENTS.md) + [`docs/FEATURE_INTAKE.md`](docs/FEATURE_INTAKE.md) — classify the work.
2. Product contract: [`docs/product/`](docs/product/) — requirements, scope, roadmap; what was asked and decided: [`docs/intents/`](docs/intents/README.md), [`docs/specs/`](docs/specs/README.md).
3. Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — index, points to detailed docs.
4. Settled decisions: [`docs/decisions/`](docs/decisions/README.md) — NEVER contradict an ADR.
5. Open work: [`docs/stories/`](docs/stories/README.md).
6. Verification expectations: [`docs/TEST_MATRIX.md`](docs/TEST_MATRIX.md).
7. Full map: [`docs/README.md`](docs/README.md).
<!-- LOOPS:END reading-order -->

## Invariant boundaries (do not violate — each is backed by an ADR)

<!-- loops-init: 3-7 boundaries, one bullet each, ending with "→ ADR-XXXX".
     RULE: a boundary with no backing ADR/doc may NOT appear here — write the ADR first.
     A good boundary = something an agent could accidentally break without context (data
     source-of-truth, module boundaries, security rules, things forbidden to add). Do not
     list ordinary coding conventions. -->

{{BOUNDARIES}}

## Stack (settled)

{{STACK}}
<!-- loops-init: one paragraph listing the decided stack, "A · B · C" style. Cite the source (ADR/SAD) if any. -->

## Common commands

> ⚠️ This is the fastest-rotting section of the file. The source of truth is `package.json` / Makefile /
> CI config — when a command here fails, fix this section in the same PR; never let it drift.

```bash
{{COMMANDS}}
```

<!-- LOOPS:BEGIN guardrails (harness-owned block — /loops:update may replace it) -->
## Operational guardrails (safety — every agent, every class of work)

- **Read-only requests never mutate the repo:** answers, explanations, reviews, diagnoses, plans, status reports — and **discovery never grants authority to fix what it finds**.
- **No `git push --force`, no rewriting pushed history.** Rebase/squash of unpushed local branches only when a human explicitly asks.
- **Delete files/directories only within the story you're working on.** Bulk or out-of-scope deletions → list them with reasons and wait for human approval first.
- **Destructive commands must be stated explicitly and confirmed:** `rm -rf`, `git reset --hard`/`checkout -- .` (discards uncommitted work), `DROP`/`TRUNCATE`, down-migrations on real data.
- **Never commit secrets** (.env, keys, tokens); declare shapes via `.env.example`.
- **Never touch production data directly** — every change goes through a reviewed migration/script.
- **Never loosen a gate to "go green":** no adding `continue-on-error`, skipping/deleting tests, or lowering coverage thresholds without a recorded human decision. During a fix task (`LOOPS_FIX_TASK=1`) test files are frozen by `fix-guard`: fix the code, not the test.
- **Operate the app by its runbook** (`docs/templates/runbook.md` → `docs/RUNBOOK-*.md`): isolated instances only, stop/delete only resources this run created, never invent commands/credentials/cleanup.
<!-- LOOPS:END guardrails -->

## Working rules for this repo

- Large work → split into a story packet (`docs/stories/`) before coding, with full front matter (`depends_on`/`consumes`/`owns`/`opens`/`proof`). See FEATURE_INTAKE.
- Any behavior change → add/edit a `proof` row in the story front matter, then `node scripts/loops-gen.mjs`. The backlog table and the TEST_MATRIX block are loops-gen output; `generated-guard` denies hand edits inside them.
- New architectural decision → add `docs/decisions/ADR-XXXX-*.md`; an Accepted ADR's body is immutable (`adr-guard`): supersede it. A question you have no authority to answer → one row in `docs/decisions/OPEN.md` with a proposal, then stop.
- Story status lives only in the story file's `status:`. Start a story only when its "Blocked by" column is empty. On a `story/ST-xxx` branch, edits outside the story's `owns` and `git add -A` / `commit -a` are blocked by the hooks in `.claude/hooks/` (`owns-guard`, `stage-guard`): the block names the fix.
- Clean docs: body text describes the current state only — NO tombstones like "(removed)", "⏸ deferred". History lives in each doc's changelog and in `docs/reviews/`.
- A new gate/mock/infrastructure module needs a call site in the same PR (a real import, a hook, or a CI job the remote reads) — its own green tests are no substitute for a consumer. None = not done.
- Before opening a PR: run the full verification set ({{VERIFY_COMMANDS}}).
{{EXTRA_RULES}}
<!-- loops-init: add project-specific rules if any (cross-platform, LF, i18n, contract-generated code...). Delete the slot otherwise. -->
