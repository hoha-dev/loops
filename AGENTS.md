# AGENTS.md — loops

> Stable shim for AI coding agents (Claude Code / Codex / Cursor). Read this file BEFORE touching any code.
> Full collaboration model: [`docs/LOOP.md`](docs/LOOP.md).

## What this project is

A repo template plus Claude Code plugin that turns the AI-native SDLC loop (Plan → Design → Build → Test → Deploy → Maintain) into files a machine can check: intent and spec before any story, story packets whose Ready/Done states are computed, owns-based isolation for parallel sessions, hooks that block the boundaries at edit time, and a review ritual that reads the code behind every invariant. The core (loops-gen, loops-check, the story front matter) was transplanted from the predecessor harness v0.7.0 together with its 36 lessons.

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


- **`template/` is the payload, the root docs are the dogfood.** `scripts/*.mjs` at the root are one-line wrappers that import `template/scripts/*.mjs`; the repo runs its own checks with the exact files it ships. → ADR-0002
- **One canonical template, in English.** No mirror tree; a consuming repo writes its own content in any language, the convention text loops-check looks for stays as shipped. → ADR-0001
- **Plugin-only installation.** Skills are used as `/loops:<name>`; they are never copied into a consuming repo's `.claude/skills/`, so bare names like `start` cannot collide. → ADR-0003
- **Advisory and deterministic layers are kept apart.** Every rule a hook can enforce is a hook (`template/.claude/hooks/`) and a check (`loops-check`), never only a sentence in AGENTS.md; a sentence that duplicates a hook is removed. → ADR-0004

## Stack (settled)

Node ≥ 20 (ESM, no dependencies) · plain Markdown templates · Claude Code plugin manifest (`.claude-plugin/`) · fixture tests in `test/run.mjs` (`node --test` not used: the runner builds throwaway git repos) · git hooks via `core.hooksPath=.githooks`. Source: ADR-0001, ADR-0002.

## Common commands

> ⚠️ This is the fastest-rotting section of the file. The source of truth is `package.json` / Makefile /
> CI config — when a command here fails, fix this section in the same PR; never let it drift.

```bash
node test/run.mjs              # fixture tests: builds throwaway repos from template/, runs the real scripts (add a case name to run one)
node scripts/loops-gen.mjs     # regenerate this repo's own backlog + TEST_MATRIX from docs/stories/*.md
node scripts/loops-check.mjs   # this repo's own doc-contract check (pre-push runs both)
node test/hooks.mjs            # hook fixture tests (ST-004) · node test/evals.mjs — the eval checker (ST-006)
node test/update.mjs           # loops-update fixtures (ST-008) · node test/release.mjs [--fixtures] — version in four places (ST-012)
node scripts/loops-update.mjs status --plugin .   # this repo against its own template; apply --plugin . after a template change (ADR-0002, ADR-0005)
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
- Before opening a PR: run the full verification set (`node test/run.mjs && node scripts/loops-gen.mjs && node scripts/loops-check.mjs`).
- Everything that is code is English; skill `description` fields also carry Vietnamese trigger phrases so the skills match Vietnamese prompts.
- A change to `template/` is a change every consuming repo receives through `/loops:update`: update `loops-install-files.txt` in the same PR when a file is added, and keep the `LOOPS:BEGIN/END` markers intact.
- Numbers in LESSONS.md and in any doc come from a run or an artifact; a lesson is a claim until a fresh rerun confirmed it (`/loops:improve`).
