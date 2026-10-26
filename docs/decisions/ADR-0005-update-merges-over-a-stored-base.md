# ADR-0005 — `/loops:update` is a three-way merge over a stored base, never a guess from two sides

- **Status:** Accepted
- **Date:** 2026-10-06
- **Supersedes / Superseded by:** —
- **Settles before:** SPEC-002, ST-008
- **Enforced by:** `scripts/loops-update.mjs` (`apply` refuses to write while any file conflicts; `--continue` refuses leftover markers and drift) · `test/update.mjs` T-UPD-1…6 · `loops-check` item 14 (manifest present, local drift of managed files)
- **Context:** v0.1's `/loops:update` diffs the consuming repo's file against the current template and asks the agent to guess which lines are local edits and which are upstream changes. With two sides there is no way to tell them apart; the skill text itself says so ("you usually cannot tell local edit from upstream improvement by diffing two sides"). repository-harness (ADR 0024/0025 there, read 2026-10-06) solves this by recording the exact bytes of every managed file at install time and running `git merge-file --diff3` per file on update, staging conflicts in a side directory so a half-merged file never reaches the live tree.

## Decision

1. **`/loops:init` records the base.** `.loops/manifest.json` carries the plugin version and, per managed or mixed file, its ownership kind and the sha256 of the template content it was installed from; `.loops/base/<path>` holds that content. Both are committed: every clone updates from the same base.
2. **`scripts/loops-update.mjs` does the merge; the skill only drives it.** For each managed file: BASE = `.loops/base/<path>`, LOCAL = the repo's file, UPSTREAM = the plugin's template; `git merge-file -p --diff3`. For a mixed file the same, scoped to each `LOOPS:BEGIN name … LOOPS:END name` block; bytes outside the markers are never read. Seeded files are never touched.
3. **All or nothing, and conflicts never touch live files.** The script computes every merge in memory first. If any file conflicts, nothing is written to the tree: the conflicting files are staged under `.loops/update/{base,local,incoming,resolved}/`, the clean merges under `.loops/update/merged/`, and the script exits 2 with the list. A person (or `/loops:update`) resolves `resolved/<path>`, then `--continue` applies everything in one pass; it refuses while a resolved file still has `<<<<<<<` markers or the live file changed since staging. `--abort` discards the staging directory. `apply` refuses to start while a staging directory exists or while a managed file has uncommitted changes (git is the backup).
4. **A repo may freeze a managed file.** `manifest.frozen` lists paths the repo replaced on purpose (this repo's wrapper scripts, ADR-0002); update skips them and `status` does not report them as drift. Freezing needs an ADR or a drift note that names the reason.
5. **Slots are the repo's.** A merged line that still contains `{{SLOT}}` and did not in LOCAL is a conflict, not a result.

## Rejected options

- **Keep the LLM diff (status quo):** cannot distinguish the two kinds of change; the skill already admitted it.
- **Get BASE from the plugin repo's git history at the old version:** needs the plugin checkout to be a git repo with history at hand, which a marketplace install does not guarantee; a stored base needs nothing.
- **A git merge driver in `.gitattributes`:** needs `git config` on every clone, the `core.hooksPath` problem again (L34).
- **Port the Rust implementation:** loops has no runtime but node; `git merge-file` is on every machine that has git.

## Consequences

- ✅ An update shows "you edited this, upstream edited that" per line, and a clean update is one command.
- ✅ `loops-check` can say "this managed file differs from what was installed" without a plugin checkout at hand.
- ⚠️ `.loops/base/` duplicates the managed files (about 60 KB at v0.2); accepted for the certainty it buys.
- ⚠️ `.loops/update/` is per clone and must be gitignored; `init` adds the line.

## Related

INT-002 row 1 · SPEC-002 · ST-008 · OPEN-002 · repository-harness ADR 0024, 0025 (external)
