# evals — regression tests for the agent configuration

> `CLAUDE.md`, `AGENTS.md`, skills and hooks steer the agent, so a change to them deserves the regression check code gets (playbook lesson 9). This folder holds the smallest useful suite: does each skill still trigger when asked three ways, and does a headless run stay within a recorded cost. Run it by hand on a cadence (after a skill or hook change, before a release of the configuration); it is not wired into CI by default because every phrasing costs a model call.

## Files

- `skills/<name>.json` — one eval per skill: `phrasings` (three ways to ask, one in the team's second language if it has one), `expect` (`contains` strings from the skill's documented output shape, `not_error`, `max_cost_usd`), optional `allowed_tools`.
- `check.mjs` — verifies one result against one eval, no jq.
- `run.sh` — runs the suite with `claude -p` (`--bare` when `ANTHROPIC_API_KEY` is set), writes `last-run.md` with pass rate and cost. `LOOPS_EVAL_MAX=1` for a smoke run.
- `last-run.md` — the record of the last run: date, mode, pass rate, cost per phrasing. Commit it; it is the number the next change is compared against.

## Adding a case

- A skill changed → re-run its eval; if a phrasing stopped triggering, the skill's `description` drifted: fix the description, not the eval.
- A production incident, or a session that went wrong → add an eval that reproduces the ask and expects the right behaviour (the playbook's "each production incident gets an eval").
- Keep expectations on the **documented output shape** of the skill (the lines its "Output shape" section prints), not on free prose, which varies per run.

## Cost

Measured on 2026-10-06, Windows, logged-in session without `--bare`: one one-word `claude -p` cost 0.698 USD because the machine's context (34,910 tokens) was loaded first. With `--bare` and an API key the context is only what the eval names. Record each run's total in `last-run.md` before deciding on cadence.
