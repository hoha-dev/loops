# LOOP.md — Human ⇄ Agent collaboration model for loops

> This repo applies the **harness pattern** (loops v0.2.5). Core idea: _an agent doesn't just need a good prompt — it needs a repo with enough context before touching code._

<!-- LOOPS:BEGIN core (harness-owned block — /loops:update may replace it) -->
## Why this layer exists

If context (constraints, decisions, how to verify) lives only in chat history or in someone's head, agents will: edit code before understanding intent, re-litigate settled architecture debates, take on large work without splitting it, and verify vaguely. The harness layer turns those things into **durable files in the repo**.

## Document map

| The agent's question                | Answered by              |
| ----------------------------------- | ------------------------ |
| What do I read first?               | `AGENTS.md`              |
| What was asked for, and why?        | `docs/intents/`          |
| What was decided it should do?      | `docs/specs/`            |
| What class of work is this, how risky? | `docs/FEATURE_INTAKE.md` |
| Which product contract does it touch?  | `docs/product/`          |
| Architecture & boundaries?          | `docs/ARCHITECTURE.md`   |
| Which decisions must I inherit?     | `docs/decisions/` (ADR)  |
| What's open, how is it split?       | `docs/stories/`          |
| What is the proof of "done"?        | `docs/TEST_MATRIX.md`    |
| Who cross-reviewed, what did they find? | `docs/reviews/`      |
| Templates for new artifacts?        | `docs/templates/`        |

## Standard flow: idea to code

```
idea / ticket / incident / metric breach
  → /loops:intent  → docs/intents/INT-nnn.md (status draft → accepted by the product owner)
  → /loops:spec    → docs/specs/SPEC-nnn.md under AGENTS.md boundaries + ADRs + skills;
                     every point a person decides = OPEN row or ADR (Proposed)
  → the product owner settles OPEN rows + Proposed ADRs in one sitting → /loops:sync → spec accepted
  → feature intake (tiny / normal / high-risk) → story packet(s) traced to the spec —
     front matter declares depends_on / consumes / owns / opens / adrs / proof
  → Ready (machine-checked: deps done · opens empty · consumes on main · owns disjoint ·
     spec accepted · ADRs Accepted for high-risk)
  → /loops:wave → /loops:start (worktree, plan mode, working contract; hooks guard owns)
  → /loops:land (0-cache verification, proof ✅, tables regenerated, headless review, PR with evidence)
  → /loops:review at each milestone; loops-check's time signals → /loops:next proposes the next intent
```

**An implementation prompt NEVER goes straight to code.** It passes through feature intake first, gets story-sized when needed, and carries its verification expectations along.

### Ready and Done are machine-checkable states

- **Ready** = every `depends_on` done · `opens` empty · every `consumes` present on main · `owns` disjoint from every active story · the spec named in `trace` is `accepted` · for a high-risk story, every ADR in `adrs` is `Accepted`. A story is **active** when its `status` is `in-progress`, or when an unmerged `story/ST-xxx` branch exists: every worktree of a clone sees the branch, but a `status` changed on the story branch is not visible from other checkouts. Miss one and `loops-check` fails, and the backlog's "Blocked by" column says what is missing. An agent does not ask "may I start"; it reads that column.
- **Done** = every `proof` ✅ · no stub marker in the entrypoints the story owns · every new export has a consumer edge · every new gate has an invoker. The module's own green tests do not substitute for the last three. The machine checks the ✅ marks and notes any ✅ proof whose id no test file mentions; whether the test asserts the right behaviour is still the reviewer's job.

### Running several agents at once

The story is the unit of parallelism; `owns` is the no-collision contract. Ritual: `/loops:wave` lists the Ready stories with disjoint `owns` → one story per session, one worktree each (`/loops:start`) → a session stages only paths inside its `owns` plus its own story file → `/loops:land` runs verification, regenerates the tables, opens the PR. The backlog and TEST_MATRIX are **never edited by hand** — they are generated from stories, so two sessions cannot clobber each other there. Merging the second story onward conflicts in these two tables (both branches regenerated them): resolve the story files first, then run `node scripts/loops-gen.mjs`. The first land of a story that crosses a package boundary is always the contract land (spec/types/stubs): that is what unlocks dependent stories.

### Running several developers at once (ADR-0007)

The same rules hold across clones, with the remote as the shared memory. **A claim is a pushed branch:** `/loops:start` pushes `story/ST-xxx` before the first edit, and `/loops:wave`, `/loops:next` and `/loops:start` fetch before they decide (`loops-gen --claims --fetch`); `loops-check` does not fetch, and notes when this clone's view of the remote is more than a day old. **Ids are allocated after a fetch** with `loops-gen --next-id ST|OPEN|INT|SPEC|ADR`, which counts every branch; two clones can still collide, so `loops-check` fails on a duplicate id after the merge and the one merged last renumbers. **A decision belongs to whoever wrote it:** on a story branch, `owns-guard` lets a story create files under `docs/decisions/`, `docs/intents/`, `docs/specs/` and edit `OPEN.md`, not edit another story's Proposed ADR or spec — to change one, supersede it or file an OPEN row. **Merge order:** the second story to merge conflicts in the two generated tables; resolve the story files, run `loops-gen`, never the block by hand. Branch protection with the CI job from `ci/` required is the gate that makes "a person approves" true for a team; whether it is on is verified at the remote, not in this repo (ADR-0006).

### Hooks: the deterministic layer (ADR-0004)

Five `PreToolUse` hooks in `.claude/settings.json` run before the agent's Edit/Write/Bash calls and block the cases a sentence used to describe: `owns-guard` (a path outside the active story's `owns`, read from the `story/ST-xxx` branch of the worktree the session is in), `stage-guard` (`git add -A` / `.` / `--all`, `git commit -a`), `generated-guard` (an edit inside a `LOOPS:GEN` block), `adr-guard` (the body of an Accepted ADR), `fix-guard` (a test file while `LOOPS_FIX_TASK=1`). A block names the rule and the way out. Every hook blocks with the JSON answer (`permissionDecision: deny`, exit 0), never with exit 2: on Windows the hook command runs under PowerShell, which reports any failing native command as status 1, and a hook that "errored" never blocks; for the same reason the commands in `.claude/settings.json` use `${CLAUDE_PROJECT_DIR}` with braces (`$CLAUDE_PROJECT_DIR` is `$null` in PowerShell) and `loops-check` fails on the unbraced form. Hooks do not run under `claude --bare`, in CI, or for a human editing by hand: `loops-check` is the layer that holds there, and it verifies the hooks are wired (item 13). Prose keeps only what no machine can decide.

Four enforcement levels, each claimed only with its own evidence (ADR-0006): **local** (a command a person runs now, with its output), **hook** (a Claude Code session with this repo's `.claude/settings.json`, nothing else), **CI** (a job the remote reads; its file in the repo is a declaration, not proof it ran on this revision), **branch protection** (verified only by someone who opened the remote's settings). Each boundary's ADR says which of these holds it on its `Enforced by:` line; `/loops:encode` is how a boundary gets one.

### Foundation pass (once, right after scaffold — before any feature story)

Read the SAD and cut **foundation stories** for the cross-cutting seams every feature will touch; test each with: _"would inserting it later force rewriting merged feature code?"_ — YES ⇒ do it first; NO ⇒ YAGNI, defer. Skip this pass and those stories still appear — mid-flight, wedged backwards into the backlog, blocking open feature work. This repo's concrete checklist sits right below this block.
<!-- LOOPS:END core -->

**This repo's foundation checklist** (repo-owned, /loops:update never touches it):

- The ported core passes its fixture tests before any new rule is added (ST-001)
- The repo runs loops-gen/loops-check on itself from the shipped files (root wrappers), so every template change is exercised here first
- Every new check or hook ships with a fixture case in `test/`
- `loops-install-files.txt` lists every shipped file with its ownership class

<!-- LOOPS:BEGIN rituals (harness-owned block — /loops:update may replace it) -->
## Roles

- **Human (PO/Tech Lead):** decides direction, approves story packets & ADRs, closes open items. Steer.
- **Agent:** reads the harness → executes within boundaries → updates TEST_MATRIX + records ADRs when tradeoffs emerge. Execute.

## Maintenance rules (every PR)

1. Behavior changed → update `TEST_MATRIX.md`.
2. New architectural decision → add an ADR (never edit old ones; use `Supersedes: ADR-XXXX`). An old ADR overtaken by reality → note it in `docs/decisions/README.md`, don't edit the ADR body.
3. Normal/high-risk work → story packet exists before code.
4. Never let important context live only in a PR description or chat.
5. **Clean docs — no tombstones.** Body text describes the current state only; inline notes like "(removed)", "⏸ deferred to next phase" are forbidden. History lives in each doc's changelog table and in `docs/reviews/` snapshots. On scope change: edit the body as if the new state were always true + one changelog line.
6. **One source of status.** Story status lives in the story file body. The backlog table (`docs/stories/README.md`) and TEST_MATRIX cells carry only a status emoji + pointer — no history, no explanations.
7. Commit messages reference codes: `(ST-xxx)`, `(ADR-xxxx)`, `(T-xxx)` — two-way traceability is the harness's most valuable property; protect it.
8. **A new gate ships with its invoker in the same PR** (a hook, a CI job the remote actually reads, or chained into the `test` target) — a gate nothing invokes does not exist; a new "gate/mock/harness" module with no consumer import is not done, regardless of its own green tests.
9. **A decision that replaces a figure → grep the old value to zero in the same PR** (it may survive only in changelogs and review snapshots) — two living sources of truth is guaranteed drift.
10. **Generated tables are never edited by hand.** The backlog and the TEST_MATRIX block are `loops-gen` output; change status/proof in the story front matter and re-run. A question that needs a human → a row in `docs/decisions/OPEN.md` with a proposal, not a paragraph buried in a story.
11. **An ADR that declares something the source of truth also names where its backup runs and when it was last restored.** In the repo, what can be recomputed and what is gone forever look identical — both are tables, both have migrations, both have tests. Only the ADR knows which one cannot be rebuilt, so the ADR carries the answer. "The ADR says it matters" plus "nobody backs it up" is a state where no document contradicts another, so a docs-only review never sees it.

## Evals ritual (after a change to the agent configuration)

`CLAUDE.md`, `AGENTS.md`, `REVIEW.md`, skills and hooks steer the agent, so a change to them is regression-tested like code (playbook lesson 9): `bash evals/run.sh` runs one eval per skill (three phrasings each) with headless Claude Code and writes pass rate and cost to `evals/last-run.md`, which is committed. Run it by hand after such a change and before a release of the configuration; the CI templates in `ci/` run it on a schedule and on merge requests that touch those paths. A phrasing that stops triggering means the skill's description drifted: fix the description, not the eval. Each incident or session that went wrong adds a phrasing.

### Why the headless review and the evals call `claude --bare -p`

Two different jobs, one flag. The review step of `/loops:land` pipes the story's diff into a second Claude with `REVIEW.md` as its system prompt: a reader that did not write the code and carries none of the session's context, so it can see what the session no longer notices. Its findings approve or block nothing; a person approves the PR. The evals ask each skill three ways through the same headless call and compare the result with the skill's documented output shape and a recorded cost; they are the regression test of the agent configuration, so a run has to measure the skill, not the machine it runs on.

`--bare` is what makes both independent of the machine: it drops the logged-in session and skips this machine's `CLAUDE.md`, hooks, plugins and skills. The review then sees only the diff and `REVIEW.md`; an eval sees only what it names, so the same input gives the same run on any developer's machine or in CI. It is also cheaper: without `--bare` a one-word `claude -p` cost 0.698 USD on 2026-10-06 because 34,910 tokens of machine context were loaded first. Because there is no logged-in session, `--bare` needs `ANTHROPIC_API_KEY` in the environment (a repository secret in CI). Without a key, drop `--bare`: `evals/run.sh` does that by itself, and the review still works at the higher cost.

## Cross-review ritual (every milestone)

However good the docs are, they cannot catch their own cross-document contradictions (a Must depending on a Should, two definitions of the same concept, orphan KPIs...). Cross-review is therefore a **recurring harness ritual**, not ad-hoc work:

- **Cadence:** every milestone / gate, or after any large docs change.
- **How:** one person/agent reads the whole chain crosswise (product ↔ roadmap ↔ ADR ↔ backlog) with impartial eyes — recording strengths as well as findings, graded by severity, with traceable references. Then **read the code enforcing each invariant and ask "which path routes around this?"**: documents agreeing with each other is no proof the code agrees with them, and the expensive bugs live in exactly that gap — an invariant with an ADR, a test and a gate still gets violated on a branch nobody enumerated.
- **Output:** an immutable snapshot in `docs/reviews/YYYY-MM-DD-*.md` (per `docs/templates/review.md`). Decisions arising from the review → update the source doc (bump its version) or add an ADR through the normal process — the review report is NOT a living doc.
<!-- LOOPS:END rituals -->
