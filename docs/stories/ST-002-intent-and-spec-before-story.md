---
id: ST-002
title: Intent and spec before any story — templates, folders, the trace check, and the two skills
trace: SPEC-001 §Main flow, playbook lessons 2–3
class: high-risk
status: done
depends_on: [ST-001]
consumes: []
owns: [template/docs/intents/**, template/docs/specs/**, template/docs/templates/intent.md, template/docs/templates/spec.md, template/docs/README.md, template/docs/LOOP.md, template/AGENTS.md, skills/intent/**, skills/spec/**, skills/next/**, template/scripts/loops-check.mjs, template/scripts/loops-gen.mjs, test/run.mjs, loops-install-files.txt]
opens: []
adrs: [ADR-0001, ADR-0004]
proof:
  - T-DOC-1 | unit | A story whose trace names a spec with status draft is not Ready; loops-check names the spec | ✅
  - T-DOC-2 | unit | A story whose trace names a SPEC-nnn or INT-nnn that has no file fails loops-check with the missing id | ✅
  - T-DOC-3 | unit | A spec with status accepted and a non-empty opens list fails loops-check (accepted means every point is resolved) | ✅
  - T-SKL-1 | manual | /loops:intent ends a design dialogue by writing docs/intents/INT-nnn.md and OPEN rows, never a DECISIONS.md | ✅
  - T-SKL-2 | manual | /loops:spec writes a spec whose "Points a person has to decide" section is non-empty or says none, and registers each point as OPEN or Proposed ADR | ✅
---

# Story Packet: ST-002 — Intent and spec before any story

- **Owner:** TrungNguyen

## Goal

The loop has an artifact before the story packet. An idea lands as `INT-nnn` in the originator's words; the agent turns an accepted intent into `SPEC-nnn` under the repo's rules, flagging every point a person must decide; story packets trace to the accepted spec and `loops-check` follows the chain (playbook lessons 2–3; harness F1: the old brainstorming skill wrote to a `DECISIONS.md` that no repo had).

## Scope

**In:** `docs/intents/`, `docs/specs/` with READMEs in the template; `templates/intent.md`, `templates/spec.md` with front matter; `loops-gen` parses intents and specs; `loops-check` item 12 (trace chain: file exists, spec accepted, accepted spec has empty `opens`); `/loops:intent` (the dialogue from the old brainstorming skill, ending in a file); `/loops:spec` (new; absorbs project B's `h-story` classification steps for the spec level); `/loops:next` learns to propose "write the spec" when a story has no accepted spec; LOOP.md flow and document map updated; manifest rows.
**Out:** ADR status gating (ST-003). Story splitting from a spec stays manual (a story packet is still written from `templates/story.md`).

## Boundaries touched

`template/scripts/*.mjs` (high-risk): new parsing and a new check item, each with a fixture. Story front matter contract: `trace:` gains meaning, no new field.

## Contract

- Intent front matter: `id, title, author, status(draft|accepted|closed), opened, source, spec[]`.
- Spec front matter: `id, title, intent, status(draft|accepted), accepted_by, accepted_on, adrs[], opens[]`.
- `trace:` on a story may list `SPEC-nnn`, `INT-nnn` and free text (`US-x.y`); only the two id forms are checked.

## Acceptance Criteria

```gherkin
Scenario: a draft spec blocks its stories
  Given SPEC-002 with status draft and ST-010 with trace "SPEC-002" and status ready
  When loops-check runs
  Then it fails and the message names SPEC-002 and ST-010

Scenario: an accepted spec with open points is inconsistent
  Given SPEC-002 with status accepted and opens [OPEN-004]
  When loops-check runs
  Then it fails naming SPEC-002 and OPEN-004
```

## Closing checklist

- [x] New check items have a case each in `test/run.mjs`; the generated backlog of this repo shows the trace column with SPEC-001.
- [x] `loops-install-files.txt` lists the four new template files (managed templates, seeded READMEs).
- [x] proof ✅; `loops-gen`; `loops-check` OK.
