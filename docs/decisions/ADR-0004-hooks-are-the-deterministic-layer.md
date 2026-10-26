# ADR-0004 — Every boundary a hook can enforce is a hook; prose never stands in for one

- **Status:** Accepted
- **Date:** 2026-10-06
- **Supersedes / Superseded by:** —
- **Enforced by:** `loops-check` item 13 (hooks wired, scripts exist; T-CORE-7) · `test/hooks.mjs` T-HOOK-1…8 (each hook's block and allow) · level: hook in a Claude Code session, check on push; CI and branch protection are the consumer's
- **Context:** The playbook distinguishes advisory controls (`CLAUDE.md`, skills — "nothing forces a session to comply with it") from deterministic ones (hooks, branch protection, plan mode — "the gate condition is enforced every time, for everyone"). The predecessor harness learned the same thing twice: a sentence in AGENTS.md did not stop two sessions clobbering each other three times in one day (L21), and a check that runs at push time only shows an `owns` violation after the second session has already run (L32). On project B, 11 files outside every active story's `owns` were changed in one commit while every check stayed green. Claude Code's `PreToolUse` hook runs before each `Edit`/`Write`/`Bash` call; exit 2 blocks the call and sends stderr to the agent; a JSON `permissionDecision: deny` does the same with a structured reason (hooks reference, read 2026-10-06; both forms run on this machine with node, no jq).

## Decision

Three layers, each with its own job, and a rule about which one a new boundary goes to:

1. **Hook (`template/.claude/hooks/*.mjs`, wired in `template/.claude/settings.json`)** — blocks the action at the moment the agent attempts it. Used for every rule whose violation is decidable from the tool call alone: a path outside the active story's `owns`, `git add -A` / `git commit -a`, an edit inside a `LOOPS:GEN` block, an edit to the body of an Accepted ADR, an edit to a test file during a fix task.
2. **Check (`loops-check`)** — verifies the repo state after the fact, for rules that need the whole repo (Ready/Done, generated tables current, invoker present, time signals). It also verifies the hooks are wired and their scripts exist, so a hook nobody runs fails the check (L26 applied to hooks).
3. **Prose (AGENTS.md, LOOP.md)** — says *why*, names the layer that enforces, and carries only the rules no machine can decide (authority axis, out-of-scope claims, clean docs).

A rule that gets a hook loses its imperative sentence in AGENTS.md; the sentence becomes a pointer ("enforced by `owns-guard`, see LOOP.md"). AGENTS.md keeps its 120-line budget this way.

## Options rejected

- **Check only (status quo):** too late by construction for parallel sessions.
- **Hook only:** a hook does not run under `claude --bare`, in CI, or for a human editing by hand; the check is the layer that holds there.
- **Managed settings / `allowManagedHooksOnly`:** needs an admin console; out of scope for a single-machine project. The settings.json hooks are the team layer the playbook describes.

## Consequences

- ✅ Violations are reported to the agent with the fix ("widen `owns` in the front matter, then run loops-check"), not discovered at merge.
- ⚠️ Hooks run on every matching tool call: each must read its inputs once and stay under a few milliseconds; the fixture tests in `test/hooks.mjs` time them.
- ⚠️ A hook reads `cwd` from its stdin JSON, not `${CLAUDE_PROJECT_DIR}`, because inside a worktree the latter stays at the project root (worktrees docs, 2026-10-06).

## Related

SPEC-001 · ST-004 · LESSONS L8, L21, L32 · playbook lessons 6, 8, 11
