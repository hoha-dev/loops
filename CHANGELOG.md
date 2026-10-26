# Changelog

All notable changes to loops are recorded here. Versions follow [Semantic Versioning](https://semver.org/).

The first entry's version must equal the plugin version (`.claude-plugin/plugin.json`), the `LOOPS_VERSION` stamp in `docs/LOOP.md` and the version in `.loops/manifest.json`; `test/release.mjs` fails when they disagree. A consuming repo sees the version it runs in `.loops/manifest.json` after `/loops:update`.

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
