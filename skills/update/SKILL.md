---
name: update
description: Update a repo's installed harness to the current plugin version — run the three-way merge (scripts/loops-update.mjs over the base recorded in .loops/), resolve the staged conflicts with the human, re-stamp LOOPS_VERSION, and re-run loops-check. Use when the user says "update the harness", "cập nhật harness", "lên version harness mới", the plugin version is newer than the repo's LOOPS_VERSION, or after pulling a new plugin release. NOT for first-time setup (/loops:init).
---

# /loops:update — a merge over the stored base, driven by the script, resolved with the human

The merge is mechanical (ADR-0005): `scripts/loops-update.mjs` compares BASE (what was installed, `.loops/base/`), LOCAL (the repo's file) and UPSTREAM (the plugin's template) with `git merge-file --diff3`, per managed file and per marker block of a mixed file. What is left for this skill is the part no script can do: explain each conflict and let the person choose. The plugin is at `${CLAUDE_PLUGIN_ROOT}` (outside a plugin install: `../../` relative to this file).

## Hard rules

1. **Conflicts never reach the live tree.** The script stages them under `.loops/update/`; you edit `.loops/update/resolved/<path>` and nothing else. A half-merged AGENTS.md corrupts agent authority for every future session.
2. **The human decides every conflict.** Show the three sides (local · base · upstream) and your proposed resolution; write `resolved/` only after a yes, per file or as an approved batch.
3. **`seeded` files are untouchable** and the script never reads them. A seeded file missing entirely → offer to create it from the template; that is the only allowed action.
4. **A `frozen` path stays the repo's.** `manifest.frozen` lists managed files the repo replaced on purpose (an ADR or a drift note names why). Never un-freeze one to "make the update clean".
5. **Never loosen a check to go green.** If `loops-check` fails after the update, the update broke something: fix that.

## Step 0 — Preconditions

```bash
node scripts/loops-update.mjs status --plugin "${CLAUDE_PLUGIN_ROOT}"
```

- No `AGENTS.md` + `docs/LOOP.md` → stop, offer `/loops:init`.
- `status` says `current` → report it and stop (unless the user asks to re-sync).
- `status` lists `modified locally since install` → those are the files that will merge three-way; name them to the user before anything runs.
- `status` reports a pending `.loops/update/` → an earlier update is half done: continue it (Step 2) or `--abort`; never start a second one over it.
- Uncommitted changes in managed files → ask the user to commit or stash first; the script refuses anyway, and git is the backup.

## Step 0a — A repo installed before v0.2 (no `.loops/`)

`status` says `no .loops/manifest.json`. There is no base yet. Run `init` against the plugin version the repo is on if that checkout is at hand (`git -C <plugin> checkout v<LOOPS_VERSION>` or the matching commit, then `node scripts/loops-update.mjs init --plugin <that checkout>`): every file then gets its real base and Step 1 is an ordinary three-way merge. Otherwise run `init --migrate` against the current plugin (`node scripts/loops-update.mjs init --migrate --plugin "${CLAUDE_PLUGIN_ROOT}"`): it records a base only for the files that are byte-equal to the template (for a mixed file, its LOOPS blocks) and names the others; `status` then says how many files have no base, and Step 1 stages each of them as a conflict with an empty base side, so the person sees the repo's whole text against upstream and decides. Tell the user plainly how many files that is before Step 1. Commit `.loops/` before Step 1.

## Step 0b — A repo on the predecessor harness: migrate the names first

A target whose files carry `HARNESS:BEGIN/END/GEN` markers, a `docs/HARNESS.md`, `scripts/harness-check.mjs` / `harness-gen.mjs`, or `harness-install-files.txt` was installed from the predecessor harness (loops' predecessor, closed at v0.7.0). Before anything else, propose one mechanical commit, as a diff for approval: rename the two scripts and every call site (lefthook, `.githooks/pre-push`, CI, `package.json` scripts, AGENTS.md "Common commands"), rename `docs/HARNESS.md` → `docs/LOOP.md` and its links, `HARNESS:` → `LOOPS:` in every marker, `HARNESS_VERSION` → `LOOPS_VERSION`, and delete any `.claude/skills/h-*/` copies (skills come from the plugin, ADR-0003). Story front matter, ADRs, OPEN rows and the generated tables are compatible as they are; a Vietnamese `OPEN.md` without the "Opened" column gets it added (empty dates are reported by `loops-check`, not invented). Then Step 0a (no `.loops/` yet), then Step 1. The managed blocks arrive in English (ADR-0001); the repo's own content keeps its language.

## Step 1 — Run the merge

```bash
node scripts/loops-update.mjs apply --plugin "${CLAUDE_PLUGIN_ROOT}"
```

Read its table: `unchanged` · `update` (clean three-way merge, written) · `create` (new in this version, written) · `frozen` (skipped) · `removed-upstream` (the plugin dropped the file; propose deleting the repo's copy, deletion always needs explicit approval) · `conflict` (staged, exit 2) · `missing-block` (nothing staged, exit 1: the repo's file has no markers for a block the template has; see below).

On `missing-block`: show the person the block in the named template file and the section of the repo's file it corresponds to, propose wrapping that section in the template's `LOOPS:BEGIN`/`LOOPS:END` lines (the section's own text stays; the merge brings upstream's changes), and on a yes write the markers, commit that one change, and run `apply` again.

Exit 0 → go to Step 3. Exit 2 → nothing was written; go to Step 2.

## Step 2 — Resolve the staged conflicts

For each name under `.loops/update/resolved/` (a mixed file's block is staged as `<path>#<block>`):

1. Show the person the diff3 region(s): `<<<<<<< local` (the repo's text), `||||||| base` (what was installed), `>>>>>>> upstream` (the new template). Say in one line what upstream changed and what the repo had changed, and propose a resolution that keeps the repo's intent and takes the upstream change.
2. On a yes, write the resolution into `resolved/<name>` (no markers left, no `{{slot}}` left).
3. When every file is resolved:

```bash
node scripts/loops-update.mjs --continue
```

It refuses while a marker or an unfilled slot remains, or when a live file changed since staging (then `--abort` and re-run `apply`). On success it writes every file in one pass, updates `.loops/base/` and the manifest, and removes `.loops/update/`.

## Step 3 — Stamp, verify, hand over

1. `LOOPS_VERSION` in `docs/LOOP.md` sits outside the managed blocks; `apply` and `--continue` rewrite its `(loops vX.Y.Z)` to the plugin version (the line `stamped docs/LOOP.md` in their output). If that line is missing, the header was customised: set the version by hand (`loops-check` notes when it disagrees with the manifest).
2. `node scripts/loops-check.mjs` must print OK. A new note about hooks or the invoker means the new version added a gate the repo has not wired: wire it (the note says how), do not silence it.
3. Report: files updated / created / frozen / conflicts resolved, with what each resolution kept, and remind the user to commit `.loops/` together with the files (do not commit unless asked).
