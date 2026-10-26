---
id: ST-006
title: Evals for the agent configuration — one trigger eval per skill, a checker without jq, a documented cost
trace: SPEC-001 §Main flow, playbook lessons 6 (step 4) and 9
class: normal
status: done
depends_on: [ST-002, ST-003]
consumes: []
owns: [evals/**, template/evals/**, skills/improve/**, loops-install-files.txt]
opens: []
adrs: []
proof:
  - T-CI-1 | unit | node evals/check.mjs passes a result whose text contains every expected string and is_error is false, and fails otherwise, without jq | ✅
  - T-CI-2 | manual | evals/skills/*.json holds one eval per shipped skill with three phrasings each (one Vietnamese), and evals/run.sh runs them with claude --bare -p and records pass rate and total cost to evals/last-run.md (smoke run 2026-10-06: 1 phrasing of next through --plugin-dir, PASS, 1.55 USD; the full 33-phrasing suite was not run) | ✅
  - T-SKL-7 | manual | /loops:improve step 5 ("fresh rerun") points at the eval runner instead of describing a manual rerun | ✅
---

# Story Packet: ST-006 — Evals for the agent configuration

- **Owner:** TrungNguyen

## Goal

A change to a skill, a hook or the template gets the regression check the playbook gives agent configuration (lesson 9), at the smallest useful size: does each skill trigger when asked three ways (lesson 6 step 4), and does the headless run stay within a recorded cost. Runs by hand on a cadence, not in CI; the cost per run is written down (one headless call without `--bare` cost 0.698 USD on 2026-10-06).

## Scope

**In:** `evals/check.mjs` (from the hands-on lab checker), `evals/skills/<skill>.json`, `evals/run.sh` (bash, node for JSON), `evals/last-run.md` written by the runner, the same folder shipped under `template/evals/` with a README so consumers add their own cases (playbook: one eval per production incident). `/loops:improve` rewired.
**Out:** a GitHub Actions job (ST-007 ships the template, nothing runs it here). Behaviour evals beyond triggering.

## Acceptance Criteria

```gherkin
Scenario: a skill that does not trigger fails its eval
  Given evals/skills/start.json expecting the text "Working on ST-" in the result
  When the runner calls claude --bare -p with one of its phrasings and the skill does not load
  Then check.mjs prints FAIL for that phrasing and the runner exits 1
```

## Closing checklist

- [x] `evals/run.sh` is named in LOOP.md as the Test-stage ritual with its cadence.
- [x] proof ✅; `loops-gen`; `loops-check` OK.
