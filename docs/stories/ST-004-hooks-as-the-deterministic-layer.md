---
id: ST-004
title: Five PreToolUse hooks that block the boundaries at edit time, with fixtures and a check that they are wired
trace: SPEC-001 §Proof, ADR-0004, playbook lessons 8 and 11
class: high-risk
status: done
depends_on: [ST-001]
consumes: []
owns: [template/.claude/**, test/hooks.mjs, template/scripts/loops-check.mjs, template/AGENTS.md, template/docs/LOOP.md, template/docs/FEATURE_INTAKE.md, loops-install-files.txt, skills/start/**]
opens: []
adrs: [ADR-0004]
proof:
  - T-HOOK-1 | unit | owns-guard denies an Edit outside the active story's owns and allows one inside, reading the story from the hook's cwd | ✅
  - T-HOOK-2 | unit | stage-guard exits 2 for git add -A, git add ., git commit -a and allows git add <path> | ✅
  - T-HOOK-3 | unit | generated-guard denies an Edit whose old_string falls inside a LOOPS:GEN block and allows one outside it | ✅
  - T-HOOK-4 | unit | adr-guard denies an Edit to an ADR whose Status is Accepted and allows a Write of a new ADR file | ✅
  - T-HOOK-5 | unit | fix-guard denies an Edit to a test file when LOOPS_FIX_TASK=1 and allows it otherwise | ✅
  - T-HOOK-6 | unit | Every hook answers an empty or malformed stdin with exit 0 (never blocks on its own failure) and runs under 300 ms including node start-up (measured by the fixture) | ✅
  - T-CORE-7 | unit | loops-check fails when .claude/settings.json names a hook script that does not exist, and notes when settings.json has no hooks block | ✅
---

# Story Packet: ST-004 — Hooks as the deterministic layer

- **Owner:** TrungNguyen

## Goal

The rules that two sessions broke three times in one day (L21) and that a push-time check only sees afterwards (L32) are enforced at the moment the agent attempts the action. Five node hooks, no jq, run on Windows Git Bash and macOS, each one answering with the fix (ADR-0004; playbook lesson 11 "a block should explain itself").

## Scope

**In:** `template/.claude/hooks/{owns-guard,stage-guard,generated-guard,adr-guard,fix-guard}.mjs`, `template/.claude/settings.json` wiring them on `PreToolUse` (`Edit|Write|MultiEdit` and `Bash`), `test/hooks.mjs` with the JSON-on-stdin fixtures, `loops-check` item 13 (hooks wired, scripts exist), AGENTS.md loses the sentences the hooks now enforce and points at LOOP.md §Hooks, `/loops:start` prints which hooks are active. Manifest rows (`managed`).
**Out:** managed settings; a Bash matcher for file-writing commands (`sed -i`, `cat >`) — claim C4 in the plan: added only if dogfood shows agents routing around the Edit matcher.

## Boundaries touched

`template/.claude/hooks` and `settings.json` (high-risk: what blocks an agent). `template/scripts/loops-check.mjs` (item 13).

## Design

- Input: the hook JSON on stdin (`tool_name`, `tool_input`, `cwd`). The active story for `owns-guard` is found from `cwd`: the current branch `story/ST-xxx` → that story file; no story branch → the hook allows everything and says so once on stderr (exit 0). Front matter is parsed with the same `parseFrontMatter` as `loops-gen` (imported from `scripts/loops-gen.mjs` relative to `cwd`'s repo root).
- Output: `exit 2` with a one-paragraph stderr message naming the rule, the file, and the two ways out (widen `owns` then run `loops-check`, or route the change to the owning story). `fix-guard` and `generated-guard` use the JSON `permissionDecision: deny` form so the reason reaches the agent verbatim.
- Never block on own failure: any exception → exit 0 with the error on stderr.

## Acceptance Criteria

```gherkin
Scenario: an edit outside owns is blocked with the fix
  Given branch story/ST-019 whose owns is [apps/web/**]
  When the hook receives an Edit of apps/api/src/x.ts
  Then it exits 2 and stderr contains "ST-019", "apps/api/src/x.ts", "owns" and "loops-check"

Scenario: git add -A is blocked
  When the hook receives a Bash command "git add -A && git commit -m x"
  Then it exits 2 and stderr names the story-scoped staging rule
```

## Closing checklist

- [x] `test/hooks.mjs` is called from `.githooks/pre-push` next to `test/run.mjs` (gate with invoker). Removed sentences: "edit only paths inside the current story's owns; stage exact paths, never git add -A", "Never hand-edit the backlog table", "never edit old ADRs" — each replaced by the hook's name.
- [x] AGENTS.md ≤ 120 lines after the edit; the removed sentences are listed in the PR.
- [x] proof ✅; `loops-gen`; `loops-check` OK.
