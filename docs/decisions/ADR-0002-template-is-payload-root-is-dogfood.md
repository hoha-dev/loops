# ADR-0002 — `template/` is the payload; the repo root runs it on itself

- **Status:** Accepted
- **Date:** 2026-10-06
- **Supersedes / Superseded by:** —
- **Enforced by:** `.githooks/pre-push` runs the repo's own check through the wrappers (local + hook when `core.hooksPath` is set; `loops-check` item 9 notes when it is not) · `.loops/manifest.json` freezes the wrappers so `loops-update` never overwrites them (T-UPD-6)
- **Context:** The predecessor harness shipped `scripts/harness-check.mjs` for four versions with a comment "wire it into CI" and no invoker, and never ran its own check on its own docs (LESSONS L26). The fixture tests in `test/run.mjs` exercise the scripts on throwaway repos, which catches regressions but not "the harness does not follow its own rules".

## Decision

The repo root carries a full set of loops docs (`AGENTS.md`, `CLAUDE.md`, `docs/…`) filled in for loops itself, with its own intents, specs, ADRs and story packets. `scripts/loops-gen.mjs` and `scripts/loops-check.mjs` at the root are one-line wrappers that `import` the shipped files from `template/scripts/`, so the check that runs here is byte-for-byte the check a consuming repo gets. `.githooks/pre-push` runs `node test/run.mjs`, `loops-gen --check` and `loops-check` (per-clone `git config core.hooksPath .githooks`, the same instruction `/loops:init` gives consumers).

## Options rejected

- **Fixture tests only (as before):** does not catch the gate-without-invoker class on the repo itself.
- **Copy the scripts to the root:** two copies drift; the identity test that guarded that was the thing ADR-0001 removed.

## Consequences

- ✅ Every template change is exercised on real docs before it ships; the repo's backlog is a `loops-gen` artifact like everyone else's.
- ⚠️ The root `docs/` is both documentation of loops and a test subject: a deliberately broken fixture must live under `test/`, never in `docs/`.

## Related

ADR-0001 · ST-001 · LESSONS L26
