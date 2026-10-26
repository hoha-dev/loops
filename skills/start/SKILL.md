---
name: start
description: Start exactly one story in a harness-managed repo — verify it is machine-Ready, create its branch and git worktree, flip status to in-progress, load only the context the front matter names (story, its ADRs, AGENTS.md), and hand the session a scoped working contract (owns, proof, exit condition). Use when the user says "start ST-xxx", "bắt đầu ST-xxx", "làm story này", or a /loops:wave start prompt says to run it. NOT for choosing which story (/loops:next / /loops:wave) and NOT for finishing one (/loops:land).
---

# /loops:start — one story, one worktree, one owns set

Turn "please work on ST-xxx" into a session that cannot wander: it knows its paths, its proof, and when it is done. The scoping is the point — a session that loads all of `docs/` and edits whatever it finds is how two sessions clobbered each other three times in one day (LESSONS L21).

## Step 1 — Gate: is it Ready by the machine's definition?

```bash
node scripts/loops-gen.mjs && node scripts/loops-check.mjs
```

Then read the story's row in the generated backlog. Start only when:

- `status` is `ready` (or already `in-progress` with no worktree — a resumed story), and
- "Blocked by" is empty, and
- `owns` is non-empty.

Otherwise **stop and report** the exact blocker (the column text is the answer): a `depends_on` not done, an `OPEN-nnn` still open, a `consumes` path missing on main, an overlap with an in-progress story. Do not "start anyway" — a story started while blocked is a story that will need rework or a PO answer mid-flight.

## Step 2 — Isolate

```bash
node scripts/loops-gen.mjs --claims --fetch                                  # another developer may have claimed it since the wave was computed
git check-ignore -q .worktrees/x || echo ".worktrees/" >> .gitignore        # commit that line on main first if it was missing
git worktree add .worktrees/<st-id-lowercase> -b story/<ST-ID> origin/main   # e.g. .worktrees/st-019 story/ST-019; no remote → base on main
git -C .worktrees/<st-id-lowercase> push -u origin story/<ST-ID>             # on the remote, not yet a claim (Step 3); rejected → someone else started it: back to /loops:wave (ADR-0007)
```

Worktrees live inside the repo at `.worktrees/`, never in a sibling directory: a sibling outlives `git worktree remove` (ignored `node_modules` stay behind) where nobody looks, and `loops-check` notes any worktree outside `.worktrees/` and fails when `.worktrees/` is not git-ignored.

If `--claims` now lists this story under a branch that is not yours, stop: someone else holds it; go back to `/loops:wave`. If the worktree already exists (resume), `cd` into it and `git pull --rebase` on the story branch. Never start a story on `main` or in a worktree another story is using. The branch name must start with `story/ST-xxx` (a `-slug` after it is fine). Without a remote the local branch is the claim, as before; with a remote and no push rights, say so in the working contract — the team then knows this claim is invisible to them.

## Step 3 — Flip status and record the claim

In the story file: `status: in-progress`. Regenerate the tables, run the check (an overlap with another in-progress story fails here — that is the check doing its job; go back to /loops:wave). Commit this one change on the story branch: `docs(ST-xxx): start`, and push it. This push is what makes the claim: until then the branch points at main's commit, and `loops-gen --claims` reads a branch with nothing beyond main as merged, not as claimed. If the push is rejected as non-fast-forward, another developer started the same story first: stop and go back to `/loops:wave`. Other checkouts do not see the status commit as a status; what they see is the unmerged `story/ST-xxx` branch, which `loops-check` and `loops-gen --claims` read from the refs every worktree shares and a fetch brings from the remote.

## Step 4 — Load only what the front matter names, in plan mode

Switch to plan mode for this step (`claude --permission-mode plan` when opening the worktree session, or `Shift+Tab` until the status bar shows `⏸ plan mode on`): Claude reads and proposes, and cannot edit until the plan is accepted (playbook lesson 4). The plan is the story packet itself — files = `owns`, order = Lands, tests = `proof`; if reading changes it, edit the packet first and re-run the check. Leave plan mode only after the working contract in Step 5 is printed.

Read, in this order and nothing more:

1. `AGENTS.md` (boundaries, guardrails, commands).
2. The story file itself.
3. Every ADR in `adrs`.
4. The product-contract sections named in `trace` — the sections, not the whole document.
5. The `consumes` artifacts (spec, types) — read them, do not edit them; they belong to another story.

Do **not** read other story files or `docs/reviews/`. If the story turns out to need something from another story, that is a missing `depends_on` or `consumes` — add it to the front matter, re-run the check, and report; do not go read the other story and improvise.

## Step 5 — Hand over the working contract

Print it once; the rest of the session works against it:

```
Working on ST-019 in .worktrees/st-019 (branch story/ST-019, pushed to origin — the claim other developers see)
Owns: apps/web/src/routes/sets/**, apps/web/src/features/sets/**   ← edit nothing outside this
Proof to turn ✅: T-SET-1 (e2e) · T-SET-2 (unit) · T-SET-3 (a11y)
Lands: 1 = read-only list (mergeable alone) · 2 = filters
Exit: every proof ✅, consumer edge named for each new export, `/loops:land` OK
Stage rule: only owns paths + docs/stories/ST-019-*.md; never `git add -A`
Hooks active: owns-guard, stage-guard, generated-guard, adr-guard, fix-guard (.claude/settings.json) — a block names the fix; do not edit around it
```

If a decision comes up that the story or ADRs do not settle, add a row to `docs/decisions/OPEN.md` with a proposal, list its id under `opens`, and stop that land — do not invent policy (FEATURE_INTAKE authority axis).

Reply in the user's language. Implementation starts only after the contract is printed.
