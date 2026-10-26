---
id: INT-001
title: A new harness repo shaped like the AI-native SDLC playbook, with the predecessor harness core inside
author: TrungNguyen (owner)
status: accepted
opened: 2026-10-06
source: idea
spec: [SPEC-001]
---

# Intent: INT-001 — A new harness repo shaped like the playbook

## Problem

The predecessor harness (v0.7.0, 9 skills, 860 lines of scripts, 36 lessons) is organised around the story packet, in Vietnamese with an English mirror that had drifted in 18 places. Someone who has read "The AI-native SDLC playbook" (Claude Academy, 14 lessons) cannot recognise the course's six stages in it, and three things the course has are missing: an artifact before the story (`intent.md` → `spec.md`), ADRs settled before build, and deterministic hooks for the boundaries that are currently sentences. Measured on project B (2026-10-06): the one consuming repo is two versions behind (v0.5.0), its last three ADRs were added 12–18 days after the stories that needed them started, and one commit changed 11 files outside every active story's `owns` with every check green.

## Proposed outcome

A new repo, `loops`, laid out by the course's six stages, that a course reader recognises at once, and that keeps everything the harness learned: `loops-gen`/`loops-check`, machine-checked Ready/Done, `owns`-based parallel work, the 36 lessons. The predecessor harness is closed; project B migrates once.

## Affected users and systems

The owner (sole developer, PO and tech lead in one person). Project B (pnpm/turbo/vitest/lefthook, Node ≥ 24, GitLab remote with frozen CI, Jenkins for CD). Any future repo that installs the plugin.

## Constraints

Code, skills and template in English; skill descriptions carry Vietnamese triggers. No dependencies in the shipped scripts (plain node, no jq: Windows Git Bash has none). Nothing is pushed anywhere. The hooks must run on Windows Git Bash and macOS. Managed settings, MCP deploy tools, Claude Tag and the Agent SDK are out of scope.

## Out of scope

Rewriting the harness from the course without transplanting the core (rejected: it would reproduce L21, L33 and L34). Auto mode as a default. A CI that runs on the owner's GitLab (frozen by its own decision).

## Open questions

- OPEN-001 — who approves specs and ADRs when PO and tech lead are one person: proposal, the same person, in one sitting, with the OPEN queue as the only inbox.
