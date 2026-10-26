# DESIGN.md — how the pieces of loops fit

> Detailed design of the repo itself. The index is `../ARCHITECTURE.md`.

## Two faces of one repo (ADR-0002)

- `template/` is the payload every consuming repo receives through `/loops:init` and `/loops:update`; `loops-install-files.txt` says which file is managed, mixed (marker blocks) or seeded.
- The root is a consuming repo of that template: `AGENTS.md`, `CLAUDE.md`, `docs/` are filled in for loops; `scripts/*.mjs` import the shipped scripts.
- `skills/` is the plugin; it is never copied (ADR-0003).

## Three layers of enforcement (ADR-0004)

| Layer | Where | Decides from | Runs when |
|---|---|---|---|
| hook | `template/.claude/hooks/*.mjs` | one tool call (stdin JSON) | before every Edit/Write/Bash in a Claude Code session |
| check | `template/scripts/loops-check.mjs` | the whole repo + git refs | pre-push, CI, `/loops:land`, `/loops:next` |
| prose | `AGENTS.md`, `docs/LOOP.md` | a person reading | every session start |

## Data the machine reads

- Story front matter (`templates/story.md`): status, depends_on, consumes, owns, opens, adrs, proof, trace.
- Intent and spec front matter (`templates/intent.md`, `templates/spec.md`): status, opens, adrs, the id chain story → spec → intent.
- ADR status line and `Enforced by` line (ADR-0006); OPEN.md rows (Opened column); `story/ST-xxx` branches as claims, local and remote (ADR-0007); `.claude/settings.json` hooks block.
- `.loops/manifest.json` (version, kind and sha256 per managed/mixed file, `frozen`) and `.loops/base/` (ADR-0005); `FETCH_HEAD`'s mtime as the age of this clone's view of the remote.

## The updater (ADR-0005)

`template/scripts/loops-update.mjs`: `init` records base + manifest; `status` reports drift (sha of managed files, block bodies of mixed files) and a pending staging; `apply` plans every file in memory (`git merge-file -p --diff3` per managed file and per `LOOPS:BEGIN/END` block), refuses on dirty managed files or an existing `.loops/update/`, writes everything or stages everything (`base/ local/ incoming/ resolved/ merged/ state.json`, exit 2); `--continue` refuses markers, unfilled slots and live-file drift, then applies in one pass; `--abort` drops the staging. Seeded files are never read; `frozen` paths are skipped. This repo freezes its wrapper scripts and hooks.

## Across developers (ADR-0007)

Claims are read from `refs/heads/story/*` and `refs/remotes/*/story/*` not merged into main; `--fetch` refreshes the latter. `--next-id` scans the working tree, every ref's tree (`git ls-tree`) and every ref's `OPEN.md` (`git show`). `loops-check` item 15 catches the collisions that still happen and names both locations; `owns-guard` allows only new files under decisions/intents/specs plus `OPEN.md`.

## Changelog

| Date | Change |
|---|---|
| 2026-10-06 | first version with ST-001 |
| 2026-10-06 | v0.2: the updater, `Enforced by`, across developers (SPEC-002) |
