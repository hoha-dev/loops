---
id: ST-018
title: Fixture tests never write to the real repo, even when pre-push runs from a linked worktree
trace: AGENTS.md "Common commands" (pre-push runs the full set) · incident 2026-10-26 during /loops:start ST-015
class: normal
status: done
depends_on: []
consumes: []
owns: [.githooks/pre-push, test/git-env.mjs, test/run.mjs, test/hooks.mjs, test/release.mjs, LESSONS.md]
opens: []
adrs: [ADR-0002]
proof:
  - T-ISO-1 | unit | this repo's .githooks/pre-push, run by git push from a linked worktree, leaves the main repo's refs and config unchanged; the same hook without its env-clearing line changes them | ✅
  - T-ISO-2 | unit | test/git-env.mjs removes every variable git rev-parse --local-env-vars lists, so a git init and git config in a temp dir started with GIT_DIR pointing at a sentinel repo leave the sentinel unchanged | ✅
  - T-ISO-3 | unit | test/run.mjs, test/hooks.mjs and test/release.mjs import test/git-env.mjs before any other import | ✅
---

# Story Packet: ST-018 — Fixture tests never write to the real repo

- **Owner:** Trung Nguyen

## Goal

On 2026-10-26, `git push` of `story/ST-015` from `.worktrees/st-015` ran `.githooks/pre-push`, and the fixture tests inside it wrote to this repo instead of their throwaway repos: local `main` moved to a fixture commit, `.git/config` got `core.bare = true` and `user.name = test`, two fixture branches and a stray worktree were registered. Measured with a probe hook (git 2.52.0): a push from a linked worktree exports `GIT_DIR=<repo>/.git/worktrees/<name>` (absolute) to the hook; a push from the main checkout exports no `GIT_DIR`. Every `git` the fixtures spawn with `cwd` in a temp dir inherits that `GIT_DIR` and acts on the real repo. `/loops:start` pushes from the worktree, so every story start in this repo hits it.

## Scope

**In:**
- `.githooks/pre-push`: `unset $(git rev-parse --local-env-vars)` before the first command. `loops-gen` and `loops-check` after it find the repo from the hook's working directory, which is the worktree root.
- `test/git-env.mjs`: deletes from `process.env` every name `git rev-parse --local-env-vars` prints, so a runner started any other way (another hook manager, an exported `GIT_DIR`) is protected too. Imported first by `test/run.mjs`, `test/hooks.mjs`, `test/release.mjs`.
- T-ISO-1 builds a temp origin, clone and linked worktree, copies this repo's `pre-push` with its test commands replaced by a probe that runs `git init` and `git config user.name leaked` in a temp dir, pushes from the worktree, and asserts the clone is unchanged; the negative control drops the `unset` line and asserts the clone changed (the probe bites).
- LESSONS.md L39.

**Out:** `test/update.mjs` imports `test/git-env.mjs` in ST-015, which owns that file and is in progress; until then the hook's `unset` covers it on push. `test/evals.mjs` spawns no git. Consumer repos: the template ships no hook that runs fixtures; `/loops:init` wires `loops-check`, which is meant to act on the repo it runs in.

## Related boundaries (AGENTS.md)

ADR-0002: the pre-push hook is how this repo runs its own shipped checks on itself; it has to be safe to trigger from the worktrees `/loops:start` creates.

## Story-closing checklist

- [x] T-ISO-1's negative control fails without the fix (say so in the PR).
- [x] A real `git push` of the story branch from `.worktrees/st-018` passes the hook and leaves `main`, `.git/config` and `git worktree list` unchanged.
- [x] All `proof` rows ✅; `node scripts/loops-gen.mjs`; `node scripts/loops-check.mjs` OK; full pre-push set green.
