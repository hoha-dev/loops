# Changelog

All notable changes to loops are recorded here. Versions follow [Semantic Versioning](https://semver.org/).

The first entry's version must equal the plugin version (`.claude-plugin/plugin.json`), the `LOOPS_VERSION` stamp in `docs/LOOP.md` and the version in `.loops/manifest.json`; `test/release.mjs` fails when they disagree. A consuming repo sees the version it runs in `.loops/manifest.json` after `/loops:update`.

## [0.2.6] — 2026-10-26

- `loops-update` no longer drops an upstream change. A mixed file with several changed blocks stages every conflicting block and carries the clean ones through `--continue` (T-UPD-9). A managed file or block with no stored base that differs from upstream is staged as a conflict with an empty base side instead of being kept as it is (T-UPD-10). `init` over files that already exist records a base only for files equal to the template, and `status` names the files left without one (T-UPD-11). `apply` with nothing to touch no longer refuses because of an unrelated dirty file (T-UPD-13).
- `REVIEW.md` carries two harness-owned blocks, `passes` and `output`, so `/loops:update` can reach it; every file listed as `mixed` must have a block (T-UPD-12).
- `/loops:update` Step 0a describes what happens to a repo installed before v0.2.

## [0.2.5] — 2026-10-26

- `/loops:init` rewrites the foundation checklist in `docs/LOOP.md` from the repo's SAD and ADRs, and checks that no shipped web-app example line is left behind (ST-014, T-SKL-12).

## [0.2.4] — 2026-10-26

- `loops-check` 5b notes only ADRs named on a boundary line (`→ ADR-nnnn`); a citation such as "Source: ADR-0001" under Stack no longer reads as a boundary. An AGENTS.md without any arrow line keeps the old behaviour (ST-013, T-ENF-3).
- `loops-check` item 9: on macOS/Linux a `.githooks/` hook without the executable bit is not counted as an invoker, since git skips it; a hook committed at mode 100644 is noted on every host, since other clones will not run it (T-CORE-9, T-CORE-10).
- `/loops:init` describes the single English template instead of a Vietnamese tree with an English mirror (T-SKL-11).

## [0.2.3] — 2026-10-26

First public release.

- Plan → Design → Build → Test → Deploy → Maintain as committed artifacts: `intent.md` → `spec.md` → story packets whose Ready and Done states are computed from front matter (`loops-gen`, `loops-check`).
- Five `PreToolUse` hooks that block an agent at edit time: `owns-guard`, `stage-guard`, `generated-guard`, `adr-guard`, `fix-guard`.
- Parallel sessions and several developers: `owns`-based isolation, a claim is a pushed `story/ST-xxx` branch, ids unique across branches.
- `/loops:update` is a three-way merge over the base recorded in `.loops/`; conflicts are staged, never written into the tree.
- Twelve skills: `intent`, `spec`, `sync`, `next`, `wave`, `start`, `land`, `review`, `encode`, `init`, `update`, `improve`.
- Evals for the agent configuration (`evals/`), CI workflow templates for GitHub and GitLab (`template/ci/`).
