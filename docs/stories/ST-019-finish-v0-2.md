---
id: ST-019
title: loops 0.2.7 — update and init without dead ends, stage-guard on story branches, the land review by a subagent
trace: independent review of ST-015 (PR #2, 2026-10-26) · docs/reviews/2026-10-26-v0.2-review.md F4 F7 · ST-016
class: high-risk
status: done
depends_on: []
consumes: []
owns: [template/scripts/loops-update.mjs, template/scripts/loops-check.mjs, template/.claude/hooks/lib.mjs, test/update.mjs, skills/update/SKILL.md, skills/init/SKILL.md, template/REVIEW.md, REVIEW.md, template/.claude/hooks/stage-guard.mjs, test/hooks.mjs, skills/start/SKILL.md, skills/land/SKILL.md, template/.claude/agents/reviewer.md, .claude/agents/reviewer.md, template/docs/LOOP.md, docs/LOOP.md, README.md, docs/WORKFLOW.md, docs/stories/ST-005-agents-plan-mode-and-review-per-pr.md, docs/stories/ST-016-stage-guard-story-scoped.md, CHANGELOG.md, .claude-plugin/plugin.json, .loops/**]
opens: []
adrs: [ADR-0004, ADR-0005, ADR-0007]
proof:
  - T-UPD-14 | unit | apply that finds a mixed file without a block's markers stages nothing, exits 1, and names the block, the template file to copy it from, and "commit, then re-run apply" | ✅
  - T-UPD-15 | unit | init records the template as base for a file the install merged into (fresh install); init --migrate records no base for it, and status names it | ✅
  - T-UPD-16 | unit | re-running init keeps every stored base and the installed version, and gives no new base to a path that had none, so the next apply merges three-way or stages | ✅
  - T-UPD-17 | unit | with no stored base, an upstream that empties a file or block is a conflict, not a silent keep | ✅
  - T-UPD-18 | unit | a mixed file checked out with CRLF line endings has its blocks found and merged | ✅
  - T-UPD-19 | unit | status does not count a manifest path the plugin template does not ship as a file without a base | ✅
  - T-HOOK-10 | unit | stage-guard checks the branch of every directory a command targets (git -C, cd on any line, chained, quoted with spaces; an unknown target when a story worktree exists) and of a story branch being rebased (detached HEAD) | ✅
  - T-SKL-14 | manual | skills/land/SKILL.md Step 5 runs the review through the reviewer subagent on a saved diff, with no claude -p call and no ANTHROPIC_API_KEY, and the lead opens each line before calling a finding CONFIRMED | ✅
---

# Story Packet: ST-019 — loops 0.2.7

- **Owner:** Trung Nguyen

## Goal

Finish v0.2 before consumers update: the independent review of PR #2 found two dead ends that 0.2.6 introduced or made common, and three edge cases; ST-016 and the land review's dependency on an API key are the rest of the open, decision-free work. One PR, as the owner asked on 2026-10-26.

## Scope

**In:**
- **Missing block (review Important 1, reproduced):** a consumer on ≤0.2.5 has a `REVIEW.md` without markers. `apply` used to stage `missing-block` items, after which `--continue` refused (the live file changed since staging) and `apply` refused (staging exists). Now a missing block is reported before anything is staged, with the exit route; the `--continue` message and `/loops:update` Step 2 say the same.
- **Fresh install vs migration (review Important 2):** `init` records the template as base for every file, as before 0.2.6, so a file `/loops:init` merged into (an existing `.claude/settings.json`) keeps a base. `init --migrate` is the 0.2.6 behaviour for a repo installed before v0.2: no base for a file that differs from the template. `/loops:update` Step 0a passes `--migrate`.
- Re-running `init` keeps the stored base of every path already in the manifest. With no base, `local ≠ upstream` is always a conflict, including an upstream that empties the text. `BLOCK_RE` accepts CRLF. `status` counts only paths the template ships.
- `REVIEW.md` keeps 0.2.6's two blocks exactly (`passes`, `output`): moving a block boundary leaves a 0.2.6 consumer either with a block nested in another (an endless `missing-block`) or without the text that left the block. The monthly-tuning paragraph says a tuned line inside `passes` is a local edit that the update merges three-way.
- **ST-016, landed here:** `stage-guard` returns unless the branch is `story/ST-xxx`; `/loops:start` Steps 2–3 say the claim becomes visible with the pushed start commit. Its proofs T-HOOK-9 and T-SKL-13 stay in ST-016's packet and turn ✅ in this PR, which sets ST-016 to done.
- **Land review without an API key:** `/loops:land` Step 5 saves the diff and hands it, with `REVIEW.md`, the story and its ADRs, to the `reviewer` subagent (fresh context, Read/Grep/Glob). The lead opens every line before CONFIRMED. `REVIEW.md`, `reviewer.md`, `docs/LOOP.md`, README, WORKFLOW and T-SKL-5 describe that.
- Version 0.2.7.

**Out:** the eval suite still calls `claude -p`: its job is to check that a fresh Claude session loads the right skill, which a subagent of this session cannot show (ST-017, OPEN-004). A Bash matcher for `owns-guard` (review F6) is the owner's decision.

## Story-closing checklist

- [x] Every new T-UPD/T-HOOK case fails on `cbac016` and passes after.
- [x] The PR's own review ran through the new Step 5 (reviewer subagent), each finding re-opened by the lead.
- [x] All `proof` rows ✅; `node scripts/loops-gen.mjs`; `node scripts/loops-check.mjs` OK; full pre-push set green.
