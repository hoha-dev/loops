---
name: land
description: Close out a story (or one land of it) in a harness-managed repo — run the real verification set with zero cache, flip proof rows and status in the story front matter, regenerate the backlog/TEST_MATRIX, stage only the story's owns, and produce the PR description that carries the acceptance evidence. Use when the user says "land it", "xong ST-xxx", "mở PR cho story này", "đóng story", or after implementation in an /loops:start worktree finishes. NOT for reviewing a milestone (/loops:review) and NOT for starting work (/loops:start).
---

# /loops:land — done means proven, wired, and generated

A story is done when the machine and a reviewer can both see it: proof rows ✅, consumer edges present, tables regenerated, evidence in the PR — not appended to the packet.

## Step 1 — Verify for real

Run the repo's verification set from `AGENTS.md` **without build cache** (`turbo run ... --force`, or the equivalent). Build-cache replay prints the old run's output verbatim, test names included; it is not evidence (LESSONS L20). Before trusting a green run, look at the `Cached: X/Y` line — anything cached is re-run.

Record the exact commands and their summary lines; they go into the PR description in Step 5. Each proof row you are about to mark ✅ should have a test whose title contains its id (`T-SET-1 …`); `loops-check` notes the ✅ rows it cannot match to any test file.

## Step 2 — Consumer edge and gate invoker (L15 / L16)

For every export, module, mock, or gate this story added:

- grep the consuming tree for the import — a real call site, in a package whose manifest declares the dependency;
- for a gate: name what invokes it, by enforcement level and only with that level's evidence (ADR-0006): *local* (the command you ran and its summary line), *hook* (the entry in `.claude/settings.json` — holds in a Claude Code session only), *CI* (the job file — a declaration; say whether you saw it run on this branch), *branch protection* (verified only if you opened the remote's settings; otherwise write "unverified").

None found → the story is **not done**. Either wire it now (if inside `owns`) or name the story whose AC contains the wiring, and leave this story `in-progress` with that story in `depends_on` of the consumer. Green tests of the module itself do not count.

## Step 3 — Update the single source of status

In the story's front matter only:

- proof rows this land proved → append `| ✅`; rows still open stay `| 🟡` (the row must keep pointing at this story);
- landing the last land → `status: done`, `opens` must already be empty;
- landing an intermediate land → status stays `in-progress`.

Then:

```bash
node scripts/loops-gen.mjs
node scripts/loops-check.mjs      # must be OK; a done story with a non-✅ proof fails here on purpose
```

No prose about the run goes into the story body. The packet is a contract with a 250-line budget; the acceptance narrative belongs in the PR.

## Step 4 — Stage by ownership, never by convenience

```bash
git add <each path under owns> docs/stories/ST-xxx-*.md docs/stories/README.md docs/TEST_MATRIX.md
git status --short          # anything unstaged outside owns is a scope violation — report it, do not add it
```

`git add -A` and `git commit -a` are forbidden in this repo for exactly this reason. A file outside `owns` that had to change means the front matter was wrong: widen `owns` only if no other active story claims the path (re-run the check), otherwise route the change to that story.

Commit message references the ids: `feat(scope): what changed (ST-xxx land N, T-DOM-n)`.

Before opening the PR, bring the branch up to date with `origin/main`. When another story landed first, `docs/stories/README.md` and `docs/TEST_MATRIX.md` conflict, because both branches regenerated them. Resolve the conflicts in the story files only, run `node scripts/loops-gen.mjs`, and stage the regenerated tables; never resolve a generated block by hand. `loops-check` fails while conflict markers remain.

## Step 5 — Review per REVIEW.md by the reviewer subagent, then the PR description

Before writing the PR description, have the diff reviewed in a fresh context by the `reviewer` subagent (`.claude/agents/reviewer.md`: Read, Grep, Glob; it starts with none of this session's context and needs no API key):

```bash
git diff origin/main...HEAD > "${TMPDIR:-/tmp}/<st-id-lowercase>.diff"      # outside the repo: never staged
```

Hand the subagent, as its whole task: the diff's path; the worktree path (its line numbers must refer to those files, so the worktree stays until the review returns); `REVIEW.md`; the story file; every ADR in `adrs`; and the Step 1 results as a given — it runs nothing (L27). Ask for the output shape in `REVIEW.md`. Then open every line it cites: a finding becomes **CONFIRMED** only once you have seen it at that line (reproduce it when it claims behaviour), stays PLAUSIBLE otherwise, and a wrong coordinate is corrected before it reaches the PR. A CONFIRMED Important finding inside `owns` is fixed before the PR, with the run repeated; one outside `owns` names the story that takes it. The findings do **not** approve or block anything: a person approves the PR. Optionally delegate the verification run to `.claude/agents/verifier.md` for a fresh-context report and paste it under "Verification".

```
## ST-xxx land N — <title>
Proof turned ✅: T-SET-1, T-SET-2   (still 🟡: T-SET-3 → land 2)
Verification (0-cache): `pnpm turbo run typecheck lint test --force` → 15/15, Cached: 0/15
Consumer edges: SetsRoute imported by apps/web/src/router.tsx; useSets used in SetsScreen
Gates added: none | theme:check — local: `pnpm -F ui test` 3/3 · hook: none · CI: declared in .gitlab-ci.yml (saw it run on this MR: yes/no) · branch protection: unverified
Decisions recorded: ADR-0014 (why X) | none
Out of scope, deliberately: <what was left and which story owns it>
Review (reviewer subagent, REVIEW.md): Important 0 · Nits 2 — <each finding CONFIRMED (line opened, behaviour reproduced) or PLAUSIBLE, and what was fixed>
```

Everything a future reviewer would otherwise dig out of the story body lives here, attached to the diff it describes.

## Step 6 — Clean up (after merge)

From the main checkout: `git worktree remove .worktrees/<st-id-lowercase>`, then delete the story branch. If the directory is still there (ignored files such as `node_modules` stay behind), delete it too. A worktree left behind is a stale `owns` claim the next `/loops:wave` has to reason about.

Reply in the user's language. Do not merge; the human merges.
