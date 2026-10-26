# loops

A repo template and a Claude Code plugin that turn the AI-native SDLC loop into files a machine can check.

Each stage (Plan → Design → Build → Test → Deploy → Maintain) ends by committing an artifact, and that commit is what lets the next stage start:

```
intent.md ──► spec.md ──► story packet ──► proof ✅ ──► PR + review ──► signals ──┐
  (PO accepts)  (OPEN + ADRs settled)  (Ready computed)  (0-cache)   (person approves)  │
  ◄────────────────────────────────────────────────────────────────────────────────┘
```

Most agent workflows describe these rules in prose and hope the agent follows them. loops makes them mechanical:

- **Ready and Done are computed** from story front matter (`depends_on`, `opens`, `consumes`, `owns`, `proof`), not typed by hand.
- **Parallel sessions are isolated by `owns`**: two stories that would edit the same paths are never handed out together.
- **Boundaries are hooks**: an agent is blocked at the moment it tries to edit outside its story, stage everything with `git add -A`, hand-edit a generated table, rewrite an accepted ADR, or change a test during a bug fix.
- **Reviews read the code behind every invariant**, not only the docs.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- Node.js ≥ 20 and git. No other dependency: hooks and scripts are plain Node (no `jq`) and run on macOS, Linux and Windows Git Bash.

## Install

In Claude Code:

```
/plugin marketplace add hoha-dev/loops
/plugin install loops@loops
```

Then, in the repo you want to manage:

```
/loops:init                                   # scan + interview → AGENTS.md, CLAUDE.md, docs/, scripts/, .claude/ hooks + agents, REVIEW.md, evals/, ci/
git config core.hooksPath .githooks           # once per clone: pre-push runs loops-gen --check + loops-check
node scripts/loops-check.mjs                  # must print "loops-check: OK"
```

## One loop

| Step | You type | It writes | Proved by |
| --- | --- | --- | --- |
| 1 | `/loops:intent` | `docs/intents/INT-001.md` (draft) + `OPEN-nnn` rows for what nobody can answer yet | the PO sets `status: accepted` in a commit |
| 2 | `/loops:spec INT-001` | `docs/specs/SPEC-001.md` (draft); every point a person must decide becomes an OPEN row or a Proposed ADR | — |
| 3 | settle those points, then `/loops:sync` | ADR `Proposed → Accepted`, OPEN rows closed, every stale statement rewritten | `loops-check` rejects an accepted spec that still has an open point |
| 4 | write story packets (`docs/templates/story.md`, `trace: SPEC-001`) | `docs/stories/ST-nnn.md` with `owns`, `proof`, `adrs` | `node scripts/loops-gen.mjs && node scripts/loops-check.mjs` — the backlog's "Blocked by" column |
| 5 | `/loops:wave` | the stories that can run now, one start prompt each | disjoint `owns`, computed |
| 6 | `/loops:start ST-001` | a worktree under `.worktrees/` on branch `story/ST-001`, plan-mode reading, a working contract | hooks `owns-guard`, `stage-guard`, `generated-guard`, `adr-guard` are active |
| 7 | implement; set `LOOPS_FIX_TASK=1` for a bug fix | the diff, tests whose names carry the `T-…` ids | `fix-guard` blocks edits to test files during the fix |
| 8 | `/loops:land ST-001` | proof ✅, tables regenerated, a review per `REVIEW.md` by the `reviewer` subagent, a PR description with the evidence | verification with build cache off; a person approves |
| 9 | `bash evals/run.sh` after changing a skill, hook or `CLAUDE.md` | `evals/last-run.md` with pass rate and cost | — |
| 10 | `/loops:review` at a milestone; `/loops:next` any time | a snapshot in `docs/reviews/` that is never edited afterwards; one recommended next task or a new intent | every finding ends as fixed, owned by a story, or rejected by a person |

Full walkthrough with commands per stage: [`docs/WORKFLOW.md`](docs/WORKFLOW.md). Collaboration model and maintenance rules: [`template/docs/LOOP.md`](template/docs/LOOP.md).

## Skills

| Skill | Stage | What it does |
| --- | --- | --- |
| `/loops:intent` | Plan | a short design dialogue that ends in a committed `intent.md`; open questions go to OPEN rows |
| `/loops:spec` | Design | requirements and design from an accepted intent, within the repo's boundaries and ADRs; decisions flagged for a person |
| `/loops:sync` | Design | carry a settled decision into every doc that still states the old one; flip the ADR and OPEN status |
| `/loops:next` | Build / Maintain | compare the backlog with the code, read `loops-check`'s notes, recommend one task |
| `/loops:wave` | Build | the Ready stories that can run in parallel, one self-contained start prompt each |
| `/loops:start` | Build | one story, one worktree, plan mode, a working contract, hooks on |
| `/loops:land` | Test / Deploy | verification with cache off, proof ✅, regenerate tables, stage only the story's `owns`, subagent review, PR evidence |
| `/loops:review` | Maintain | milestone cross-review of the docs chain and of the code that enforces each ADR (starting from its `Enforced by` line) |
| `/loops:encode` | Maintain | turn one boundary into the smallest check the repo runs, with a passing and a failing case, and record it on the ADR |
| `/loops:init` | — | set up a repo from `template/`: scan, list invariants vs existing checks, interview, generate, record the installed base in `.loops/` |
| `/loops:update` | — | three-way merge of the shipped files over the recorded base; conflicts are staged for review, never written into the tree |
| `/loops:improve` | — | change loops itself as a recorded experiment: baseline → earliest gap → hypothesis with a removal condition → fresh rerun → verdict |

## What is enforced where

| Rule | Hook (before the action) | Check (`loops-check`, on push / in CI) |
| --- | --- | --- |
| edits stay inside the active story's `owns` | `owns-guard` | note on changed files outside every `owns` |
| stage exact paths (`git add -A` / `commit -a` are blocked) | `stage-guard` | — |
| the backlog table and TEST_MATRIX are `loops-gen` output | `generated-guard` | stale or conflicted block → fail |
| an Accepted ADR's body does not change | `adr-guard` | — |
| test files do not change during a fix (`LOOPS_FIX_TASK=1`) | `fix-guard` | a ✅ proof needs a test that names its id (note) |
| Ready = deps done · no open questions · consumed work merged · `owns` disjoint · spec accepted · ADRs Accepted (high-risk) | — | fail when a story marked `ready` is blocked |
| the gate has a caller; hooks are wired | — | "declared in", never "proven to run" |
| a boundary's ADR names what enforces it (`Enforced by`) | `adr-guard` allows that line to change | note |
| across developers: a claim is a pushed branch; ids are unique | `owns-guard` (create-only under decisions/intents/specs) | duplicate id → fail; stale fetch → note |
| shipped files match the installed base | — | drift, version mismatch, half-finished update → notes |

Hooks run inside a Claude Code session that loads the repo's `.claude/settings.json`. They do not run under `claude --bare`, in CI, or when a person edits by hand; `loops-check` is the layer that holds there. `AGENTS.md` and `LOOP.md` keep only what no machine can decide. Design: [ADR-0004](docs/decisions/ADR-0004-hooks-are-the-deterministic-layer.md), [ADR-0006](docs/decisions/ADR-0006-a-boundary-names-its-enforcement.md).

## Several developers

The remote is the shared state ([ADR-0007](docs/decisions/ADR-0007-a-claim-is-a-pushed-branch.md)). `/loops:start` pushes `story/ST-xxx` before the first edit, so other clones see the story as taken. `/loops:wave`, `/loops:next` and `/loops:start` run `loops-gen --claims --fetch` first. New ids come from `loops-gen --next-id ST|OPEN|INT|SPEC|ADR`, which counts every branch; `loops-check` fails on a duplicate id after a merge.

## Updating a repo that uses loops

`/loops:init` records what it installed in `.loops/` (committed). `/loops:update` runs `node scripts/loops-update.mjs apply --plugin <plugin dir>`: each shipped file, and each `LOOPS:BEGIN/END` block of a file the repo shares with loops, is merged three-way with `git merge-file --diff3`. A clean merge is written; a conflict is staged under `.loops/update/` and the tree is not touched until `--continue` ([ADR-0005](docs/decisions/ADR-0005-update-merges-over-a-stored-base.md)). To keep its own version of a shipped file, a repo lists it under `frozen` in `.loops/manifest.json`.

## Repository layout

```
template/                 what a repo receives (English, one tree): AGENTS.md, CLAUDE.md, REVIEW.md,
                          docs/ (intents, specs, decisions, stories, reviews, templates), scripts/,
                          .claude/ (settings.json, hooks/, agents/), evals/, ci/
skills/<name>/            the plugin's skills (never copied into a repo)
loops-install-files.txt   which shipped file is managed / mixed (marker blocks) / seeded
LESSONS.md                why each default exists, and where it is encoded
CHANGELOG.md              one entry per version
test/                     fixture tests: scripts, hooks, updater, eval checker, release contract
.loops/                   this repo's own installed base
docs/, AGENTS.md, …       loops developed with loops (see below)
```

## Development

This repo uses its own `template/` ([ADR-0002](docs/decisions/ADR-0002-template-is-payload-root-is-dogfood.md)): `scripts/*.mjs` at the root are one-line wrappers around `template/scripts/*.mjs`, and loops' own intents, specs, ADRs and stories live in `docs/`.

```bash
git config core.hooksPath .githooks   # pre-push runs everything below
node test/run.mjs                     # fixture tests on throwaway git repos
node test/hooks.mjs                   # hook fixtures
node test/update.mjs                  # updater fixtures
node test/evals.mjs                   # eval checker
node test/release.mjs --fixtures && node test/release.mjs   # version is the same in all four places
node scripts/loops-gen.mjs && node scripts/loops-check.mjs  # this repo's own doc contract
```

Contributions follow the same loop: read [`AGENTS.md`](AGENTS.md) and [`docs/FEATURE_INTAKE.md`](docs/FEATURE_INTAKE.md) first.

## Acknowledgements

- The stage layout follows *The AI-native SDLC playbook* (Claude Academy). Lesson numbers cited in the docs refer to that course.
- The stored-base update, encoding a boundary with enforcement levels, and improvement experiments on file were adapted from [repository-harness](https://github.com/hoangnb24/repository-harness) (see [INT-002](docs/intents/INT-002-ideas-from-repository-harness.md)).

## License

[MIT](LICENSE) © 2026 Trung Nguyen
