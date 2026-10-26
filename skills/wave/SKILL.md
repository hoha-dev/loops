---
name: wave
description: Compute the set of stories that can run in parallel right now in a harness-managed repo — machine-Ready stories with disjoint `owns` — and emit one self-contained start prompt per story for fan-out to separate sessions/worktrees. Use when the user wants to run several agents at once, asks "what can run in parallel", "chạy song song được gì", "chia wave", "fan out", or before spawning multiple sessions. NOT for picking a single next task (/loops:next) and NOT for implementing (/loops:start does the per-story setup).
---

# /loops:wave — the parallel-ready set, computed, not guessed

Output a **wave**: the stories that may start now without colliding, plus a start prompt for each. Waves used to be hand-written paragraphs in a review doc and rotted within days (LESSONS L18, L21). This skill derives the wave from story front matter every time it runs.

Requires stories with front matter (`docs/templates/story.md`). Legacy packets without it are listed as "not eligible — add front matter" and never enter a wave.

## Step 1 — Refresh and verify the board

```bash
node scripts/loops-gen.mjs        # tables from stories
node scripts/loops-check.mjs      # must be OK before any fan-out
node scripts/loops-gen.mjs --claims --fetch   # fetches first, then: stories in progress anywhere — status in-progress here, or an unmerged story/ST-xxx branch, local or pushed by another developer (ADR-0007)
```

The first line of `--claims` says whether the fetch happened. `not fetched` with a remote configured means the wave is built from a stale view of the other developers' branches: say so in the wave output and do not hand out a story another clone may already hold.

A red check means the board lies somewhere (stale table, a story marked ready while blocked, overlapping owns). Fix the board first — fanning out on a lying board multiplies the lie by the number of sessions.

## Step 2 — Build the candidate set

From `docs/stories/README.md` (generated block) and the story files:

1. Candidates = stories with `status: ready` and an empty "Blocked by" column. Stories printed by `--claims` are already taken — list them as **occupied** with their `owns`; they constrain the wave but do not join it. A story can read `ready` in this checkout and still be taken: its `status: in-progress` commit lives on its own branch, so trust `--claims`, not the status column. An in-progress story whose "Blocked by" names an `OPEN-nnn` is **occupied but stalled**: its paths stay reserved, and that OPEN goes to the top of Step 3.
2. Drop any candidate whose `owns` overlaps an occupied story or another candidate (prefix overlap, same rule as `loops-check`). When two candidates overlap, keep the one that unblocks more downstream stories (count `depends_on` edges pointing at it); name the dropped one and why.
3. Drop candidates whose `owns` is empty — a story that declares no paths cannot be proven disjoint. Say so; the fix is one line in the front matter.
4. Cap the wave at what the human can review: default 3 stories, or the number the user gave.

## Step 3 — Check the human is not the hidden serial point

Read `docs/decisions/OPEN.md` and the ADRs with `Status: Proposed` (`loops-gen` treats a Proposed ADR like an open row for high-risk stories). If several *non-candidate* stories are blocked only by open rows, Proposed ADRs or a draft spec, say so up front: one decision session by the PO may be worth more than this wave. List those ids with what each unlocks.

## Step 4 — Emit the wave

```
## Wave — <date>
Occupied: ST-012 (owns apps/api/src/auth/**, apps/mobile/**)
Ready and disjoint: ST-019, ST-021, ST-023
Dropped: ST-020 — owns apps/web/src/routes/** overlaps ST-019 (apps/web/src/routes/sets/**); run after ST-019 lands
Not eligible: ST-007 (no front matter) · ST-022 (opens: OPEN-004)
Would unlock more: closing OPEN-004 + OPEN-005 frees ST-022 and ST-024 — PO session suggested

### Start prompt — ST-019
Run `/loops:start ST-019`. You own only: apps/web/src/routes/sets/**, apps/web/src/features/sets/**.
Read: docs/stories/ST-019-*.md, ADR-0002, ADR-0006, AGENTS.md. Do not read other stories.
Done when every proof row is ✅ and `/loops:land` passes. Stage only your owns + your story file.
```

One prompt per story, each **self-contained**: the receiving session has no memory of this conversation. The prompt names the owns, the ADRs from the front matter, the story file, and the exit condition — nothing else. Keep each under 12 lines.

## Rules

- Never widen a story's `owns` to make it fit — overlap is information, not an obstacle.
- Never include a story whose `consumes` is not on main "because it will be soon". The contract land of the producing story is the gate; say which story that is.
- Reply in the user's language. Do not start any story — hand the prompts over and stop.
