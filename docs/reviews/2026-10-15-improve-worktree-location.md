# Improvement — story worktrees live in `.worktrees/` inside the repo, and loops-check says when one does not

> Date: 2026-10-15 · Owner: Trung Nguyen · Scope: skills/start/SKILL.md, skills/land/SKILL.md, template/scripts/loops-check.mjs (item 16), template/scripts/loops-update.mjs (`cmdInit`), test/run.mjs
> Snapshot: written once by `/loops:improve`, never edited afterwards. Lives in `docs/reviews/YYYY-MM-DD-improve-<slug>.md`.

## 1. Representative job

Project C, sprint 0, 2026-10-15: `/loops:wave` handed out ST-001, ST-002, ST-005; each session ran `/loops:start`, which created `../project-c-st002` and `../project-c-st005` next to the repo (skills/start/SKILL.md:28). After the merges the owner noticed `../project-c-st002` had not been cleaned up and set a repo rule: worktrees go in `.worktrees/` inside the repo (project C's AGENTS.md "Working rules").

## 2. Baseline (what happened without the change)

- `git worktree list` in project C showed only `main`, but `../project-c-st002` was still on disk holding `apps/`, `packages/`, `node_modules/` (0 files outside `node_modules`): `git worktree remove` had left the ignored dependency tree behind, and nothing in the repo pointed at the sibling directory, so nobody saw it until the owner looked at the parent folder.
- The project C rule in AGENTS.md says "This overrides the `../<repo>-<st-id>` path in `/loops:start`"; a session that follows the skill text literally still writes `../<repo>-<st-id>`. The rule exists only as prose that contradicts the skill.

## 3. Earliest gap

| Kind | Domain ownership (the skill owned the path and chose a location outside the repo nobody looks at) |
| --- | --- |
| Where | skills/start/SKILL.md Step 2 (`git worktree add ../<repo>-<st-id-lowercase> …`) and skills/land/SKILL.md Step 6 (`git worktree remove ../<repo>-<st-id>`) |
| Why this is the earliest | The path is chosen there; every later artefact (the leftover directory, the consumer's overriding prose) follows from it. No check reads where worktrees live. |

## 4. Correct owner of the fix

Skill text for the path (start, land), `loops-update init` for the `.gitignore` line, and a check (loops-check item 16) for what prose cannot hold: a worktree outside `.worktrees/` is noted, a worktree inside `.worktrees/` that git does not ignore fails (its files would show as untracked and `git add` would pick them up). The consumer's AGENTS.md sentence can then go.

## 5. Hypothesis

**If** /loops:start and /loops:land use `.worktrees/<st-id-lowercase>`, `loops-update init` git-ignores `.worktrees/`, and loops-check item 16 reports any linked worktree outside it **at** skills/start Step 2, skills/land Step 6, cmdInit and loops-check **then a fresh agent will** create and remove story worktrees inside the repo, and a stray one shows up in the next `loops-check` run **because** the path is the literal command the skill prints, and the check reads `git worktree list`, which every session runs through on pre-push.

- **Evidence that would weaken this:** the start eval run creates a worktree outside `.worktrees/`; or tools in a consumer repo (eslint, tsc, a root test runner) start reading `.worktrees/**` and fail — then inside-the-repo is the wrong place and a sibling directory with a check is the better fix.
- **Maintenance owner and removal condition:** Trung Nguyen. Remove item 16 if no consumer run prints its note or failure in 90 days of story work; revert the location if a consumer reports a tool scanning `.worktrees/`.

## 6. Fresh rerun

| What ran | Fresh session? | Hit the changed path? | Result | Cost |
| --- | --- | --- | --- | --- |
| `node test/run.mjs` (T-WT-1, T-WT-2) | no (fixture) | yes: loops-check item 16 on a sibling worktree, an ignored and an unignored .worktrees/ worktree | 30/30 ok | 0 |
| `node test/update.mjs` | no (fixture) | yes: cmdInit writes .worktrees/ | all ok | 0 |
| `bash evals/run.sh start` (now expects `.worktrees/st-007`) | yes | — | not run yet | about 3–4 USD per phrasing (last run 2026-10-06: 4.09 USD) |
| next `/loops:start` in project C (ST-006 or ST-007) | yes | yes | pending | 0 extra |

The fixtures prove the check and the init line; they do not prove a fresh agent follows the new Step 2. That needs one of the two fresh rows above; the verdict waits for it.
