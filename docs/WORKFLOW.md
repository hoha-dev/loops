# WORKFLOW.md — one loop, stage by stage

> How a piece of work moves through a loops-managed repo, from an idea to the next idea. Each stage names its artifact, the skill that writes it, the gate that closes it (hook · check · human), and the playbook lesson it comes from. The short version is the flow block in `docs/LOOP.md`; this page is the walkthrough with the commands.

```
Plan ──► Design ──► Build ──► Test ──► Deploy ──► Maintain ──┐
 ▲ intent.md  spec.md   story    proof ✅  PR+review  signals  │
 └──────────────────────────────────────────────────────────┘
```

| Stage | Artifact (committed) | Written by | Gate that closes it | Playbook |
| --- | --- | --- | --- | --- |
| Plan | `docs/intents/INT-nnn.md` | `/loops:intent` | human: PO sets `status: accepted` | lesson 2 |
| Design | `docs/specs/SPEC-nnn.md` + OPEN rows + ADRs (Proposed → Accepted) | `/loops:spec`, `/loops:sync` | human settles OPEN + ADRs; check: spec `accepted` has no open point | lessons 3, 11 |
| Build | story packets, `story/ST-xxx` branches **pushed** (the claim other developers see), the diff | story packet by hand or from the spec; `/loops:wave`, `/loops:start` | check: Ready computed, duplicate ids fail; hooks: `owns-guard`, `stage-guard`, `generated-guard`, `adr-guard` | lessons 4–7 |
| Test | `proof` rows ✅, test titles carrying the ids, `evals/last-run.md` | `/loops:land` step 1; `.claude/agents/verifier.md`; `evals/run.sh` | check: ✅ needs a test naming the id (note); hook: `fix-guard` during a fix | lessons 8–9 |
| Deploy | the PR with its evidence and the headless review | `/loops:land` steps 2–5, `REVIEW.md` | human: branch protection / code owner; check: gate has an invoker, hooks wired | lessons 10–12 |
| Maintain | review snapshot in `docs/reviews/`, `loops-check` time signals | `/loops:review`, `/loops:next` | check: OPEN age, review distance, stray files → proposals, never actions | lesson 13 |

## Plan — capture the intent

```
/loops:intent          # a short dialogue, then docs/intents/INT-nnn.md (status: draft)
```

The originator says what cannot be done today, who is affected, what better looks like, what is out of scope; the skill asks what an analyst would and writes the file in their words. Questions nobody can answer become `OPEN-nnn` rows **now**, each with a proposal. The product owner reads the file and flips `status: accepted` in a commit. That commit is the trigger for the next stage.

Measure (lesson 2): time from the first conversation to the committed intent; share of intents accepted rather than closed.

## Design — spec, with every decision flagged

```
/loops:spec INT-nnn    # docs/specs/SPEC-nnn.md (status: draft) under AGENTS.md + ADRs + skills
# the PO settles the OPEN rows and the Proposed ADRs in one sitting
/loops:sync            # flips ADR status, closes OPEN rows, rewrites every assertion of the old state
# the PO flips the spec to status: accepted
```

"Points a person has to decide" is the section that matters: each point is an OPEN row or a Proposed ADR, and `loops-check` refuses an `accepted` spec that still has one. A Proposed ADR also blocks Ready of every high-risk story that inherits it, so decisions are taken before build, not 12–18 days after (what happened on the repo this came from).

Measure (lesson 3): time between the intent commit and the spec commit; spec edits dated after the first story went in progress.

## Build — stories, waves, worktrees, hooks

```
# split the accepted spec into story packets (docs/templates/story.md; trace: SPEC-nnn)
node scripts/loops-gen.mjs --next-id ST                      # the next free id across every branch (ADR-0007)
node scripts/loops-gen.mjs && node scripts/loops-check.mjs   # Ready is computed, the backlog says what blocks
/loops:wave            # fetches, then the set of Ready stories with disjoint owns minus what any clone has claimed, one start prompt each
/loops:start ST-xxx    # fetch → worktree + story/ST-xxx branch → push (the claim) → plan mode for the reading step → working contract
```

Ready = `depends_on` done · `opens` empty · `consumes` on main · `owns` disjoint from every active story · spec accepted · ADRs Accepted (high-risk). Active = `status: in-progress` or an unmerged `story/ST-xxx` branch, local or on the remote: every worktree of a clone sees the local ones, every clone that fetched sees the pushed ones. `loops-check` notes a clone whose last fetch is more than a day old.

From the moment the session is on the story branch, four hooks run before each edit or command: an edit outside `owns` is blocked with the two ways out; `git add -A` / `commit -a` are blocked; an edit inside a `LOOPS:GEN` block is denied with the command to run; the body of an Accepted ADR is immutable. The block message is the instruction; do not edit around it.

Measure (lessons 4, 7): share of changes merged from the first pass; concurrent sessions per engineer while review keeps up.

## Test — the loop checks its own work

```
<verification set from AGENTS.md>, with no build cache      # /loops:land step 1
LOOPS_FIX_TASK=1 claude                                     # during a bug fix: test files are frozen by fix-guard
bash evals/run.sh                                           # after a change to CLAUDE.md / AGENTS.md / skills / hooks
```

A proof row turns ✅ only with a test whose title carries its id; `loops-check` notes a ✅ it cannot find a test for. For a fix, the failing test is written and committed first, then the code is changed with `fix-guard` on. The verifier subagent repeats the verification in a fresh context and reports; it never fixes.

Measure (lessons 8–9): first-pass CI success; eval pass rate over time and the cost per run.

## Deploy — land, review, approve

```
/loops:land ST-xxx     # 0-cache verification → proof ✅ → tables regenerated → stage by owns → headless review → PR
```

The PR description carries the evidence: the exact commands and their summary lines (with the `Cached: X/Y` line), consumer edges for every new export, the enforcement of every new gate by level (local · hook · CI declared · branch protection unverified), decisions recorded, what was left out and which story owns it, and the headless review per `REVIEW.md` (findings PLAUSIBLE until a person opens the line). Findings never approve or block; a person does, through branch protection. The CI templates in `ci/` run `loops-gen --check` and `loops-check` on every push and the evals on configuration changes, with no `continue-on-error`.

Measure (lessons 10, 12): time to first review; defects caught before merge against those escaping.

## Maintain — the loop restarts itself

```
node scripts/loops-check.mjs    # notes: OPEN rows older than 30 days, stories done since the last review, files outside every owns
/loops:next                     # reads those notes and the backlog; proposes one next task — or a new intent
/loops:review                   # at each milestone: docs chain + the code behind every invariant → immutable snapshot
```

`loops-check` has a time axis: a question nobody answered for 30 days, a review debt, a file no story owns. They are notes, not failures — blocking a push because a person is slow punishes the wrong person. `/loops:next` turns them into a proposal, and a proposal that needs a decision becomes an intent, which is where the loop started. The review's findings close in one of three states — fixed, owned by a story, or refused with the reason written down — so the same finding is not caught twice.

Measure (lesson 13): time from a signal to an intent in the queue; share of findings that become merged fixes.

## Where each rule is enforced

| Rule | Hook (before the action) | Check (after, on push/CI) | Prose |
| --- | --- | --- | --- |
| edit only inside `owns` | `owns-guard` | item 11 (stray files, note) | pointer in AGENTS.md |
| stage exact paths | `stage-guard` | — | pointer |
| generated tables not edited by hand | `generated-guard` | item 7 (stale/conflict → fail) | LOOP.md rule 10 |
| Accepted ADR immutable | `adr-guard` | — | LOOP.md rule 2 |
| tests frozen during a fix | `fix-guard` | 8b (✅ needs a test) | guardrail |
| Ready / Done | — | item 7 | LOOP.md |
| spec accepted, ADRs settled | — | items 7, 12 | specs/README |
| a gate has an invoker; hooks wired | — | items 9 ("declared in"), 13 | LOOP.md rule 8 |
| a boundary's ADR names its enforcement | `adr-guard` (the line is editable) | item 5b (note) | ADR-0006; `/loops:encode` |
| a claim is a pushed branch; ids unique across clones | `owns-guard` (create-only under decisions/intents/specs) | item 15 | LOOP.md "several developers" |
| managed files match the installed base | — | item 14 (notes) | ADR-0005; `/loops:update` |
| authority (no invented policy) | — | — | FEATURE_INTAKE |
| clean docs, no tombstones | — | — | LOOP.md rule 5 |

## Updating a repo to a new loops version

```
node scripts/loops-update.mjs status --plugin <plugin dir>   # installed vs plugin version, managed files modified locally, pending staging
/loops:update                                                 # apply → clean merges written; conflicts under .loops/update/ → resolve → --continue
```

The base recorded by `/loops:init` is what makes this a three-way merge: BASE = what was installed, LOCAL = the repo's file, UPSTREAM = the new template; a conflict shows both edits side by side and never reaches the live file (ADR-0005). This repo updates itself the same way after a template change (`apply --plugin .`).

A hook runs only inside a Claude Code session with `.claude/settings.json` loaded (not under `claude --bare`, not in CI, not for a human editing by hand); the check is the layer that holds everywhere else. Prose keeps what no machine can decide.
