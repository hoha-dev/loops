---
id: ST-013
title: loops-check 5b reads only boundary lines, item 9 sees a non-executable .githooks hook, init names one template
trace: ADR-0006 points 1 and 3
class: high-risk
status: done
depends_on: []
consumes: []
owns: [template/scripts/loops-check.mjs, test/run.mjs, skills/init/SKILL.md, CHANGELOG.md, .claude-plugin/plugin.json, docs/LOOP.md, .loops/**]
opens: []
adrs: [ADR-0006]
proof:
  - T-ENF-3 | unit | an ADR named in AGENTS.md outside a "→ ADR-nnnn" boundary line gets no Enforced-by note; an AGENTS.md with no such line still has every reference checked | ✅
  - T-CORE-9 | unit | on macOS/Linux a .githooks/pre-push without the executable bit does not count as invoker, and the note names chmod +x | ✅
  - T-CORE-10 | unit | a .githooks hook committed as mode 100644 is noted with "git update-index --chmod=+x" even where this clone runs it | ✅
  - T-SKL-11 | manual | skills/init/SKILL.md names one English template, no Vietnamese canonical tree and no mirror | ✅
---

# Story Packet: ST-013 — Boundary lines, executable hooks, one template in init

- **Owner:** Trung Nguyen

## Goal

Three defects found while installing loops 0.2.3 into a new consumer repo on 2026-10-26:

1. `loops-check` 5b noted ADR-0001 as "backs an AGENTS.md boundary" because the Stack paragraph says "Source: ADR-0001" — which `template/AGENTS.md` itself asks for. ADR-0006 point 1 scopes the note to ADRs that back a boundary, and the template's convention is one bullet per boundary ending in `→ ADR-XXXX`.
2. Item 9 printed "declared in: .githooks/pre-push" for a hook committed without the executable bit; git on macOS and Linux ignores such a hook ("hint: The '.githooks/pre-push' hook was ignored because it's not set as executable", seen pushing this repo on 2026-10-26). ADR-0006 point 3: a level is claimed only with its own evidence.
3. `skills/init/SKILL.md` still describes a Vietnamese canonical `template/` and an English mirror, which ADR-0001 removed.

## Scope

**In:** 5b takes the ids from lines carrying `→ ADR-nnnn`; when AGENTS.md has none it falls back to every reference, so a repo that writes boundaries differently keeps its notes. Item 5 (a referenced ADR file must exist) keeps reading every reference. Item 9: on a non-Windows host a `.githooks/` file without an executable bit is not an invoker (note with `chmod +x` and `git update-index --chmod=+x`); a tracked `.githooks/` file at index mode 100644 is noted on every host, because other clones will not run it. `fixture()` in `test/run.mjs` writes its hook with mode 0755, as a real install must. Version 0.2.4.
**Out:** `.husky/` files: husky runs them through `sh`, so their mode does not matter. A Windows host's own working copy: git there runs hooks whatever the mode.

## Closing checklist

- [x] proof ✅; `loops-gen`; `loops-check` OK; full pre-push set green.
