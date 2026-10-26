---
id: ST-016
title: stage-guard applies only on a story branch; /loops:start says when the claim becomes visible
trace: ADR-0004, ADR-0007 · docs/reviews/2026-10-26-v0.2-review.md F4 F7
class: high-risk
status: draft
depends_on: [ST-015]
consumes: []
owns: [template/.claude/hooks/stage-guard.mjs, test/hooks.mjs, skills/start/SKILL.md, CHANGELOG.md, .claude-plugin/plugin.json, docs/LOOP.md, .loops/**]
opens: []
adrs: [ADR-0004, ADR-0007]
proof:
  - T-HOOK-9 | unit | stage-guard allows git add -A on main and outside any repo, and blocks it on a story/ST-xxx branch | ☐
  - T-SKL-13 | manual | skills/start/SKILL.md says the claim is visible to other clones once the start commit is pushed, not when the empty branch is pushed | ☐
---

# Story Packet: ST-016 — stage-guard on story branches only

- **Owner:** Trung Nguyen

## Goal

AGENTS.md and ST-004's acceptance criteria describe a story-scoped staging rule; the hook blocks on every branch and in every directory, including a heredoc that only writes a script (F4, seen twice on `main` in the 2026-10-26 review). And `/loops:start` Step 2 says a pushed branch is a claim, which `loadClaims` does not count until it has a commit beyond main (F7).

## Scope

**In:** `stage-guard` returns early unless `currentBranch(repoRoot(input))` matches `story/ST-\d+`, the same test `owns-guard` uses. `skills/start/SKILL.md` Step 2 and Step 3: the claim becomes visible with the pushed start commit; a second developer starting the same story is stopped by git rejecting their Step 3 push. Version bump after ST-015.
**Out:** parsing heredocs or quoted text inside a story-branch command: on a story branch a false positive costs one rewrite of the command, and the rule is meant to bite there. A Bash matcher for `owns-guard` is review F6, an owner's decision.

## Related boundaries (AGENTS.md)

ADR-0004 (the hook stays the deterministic layer for staging, scoped as documented). ADR-0007 (the claim mechanism is unchanged; only the skill's sentence about when it takes effect).

## Story-closing checklist

- [ ] All `proof` rows ✅; `node scripts/loops-gen.mjs`; `node scripts/loops-check.mjs` OK; full pre-push set green.
