# ADR-0001 — One canonical template, written in English

- **Status:** Accepted
- **Date:** 2026-10-06
- **Supersedes / Superseded by:** —
- **Enforced by:** `loops-check` item 3 (the convention phrases are looked up in English or Vietnamese, never a third copy) · `test/run.mjs` "messages: check output is English only" · no `template-*/` mirror exists to drift (structural)
- **Context:** The predecessor harness kept a Vietnamese canonical `template/` and an English mirror `template-en/`; at v0.7.0 the two trees differed in 18 places and a fixture test existed only to prove the two script copies were byte-identical. The course this repo follows is English, and skills must be English anyway (user rule). A consuming repo's own content (product docs, stories, ADR bodies) is written in whatever language its team uses.

## Decision

`template/` is the only template and it is written in English. There is no mirror tree. `loops-check` keeps accepting both the English and the Vietnamese convention phrases it already knows (`no tombstones` / `không tombstone`, `Status cell convention` / `Quy ước cell trạng thái`) so a repo that migrated from the predecessor harness still passes.

## Options rejected

- **Keep VI canonical + EN mirror:** two trees to keep in sync by hand; the drift was already measurable.
- **Generate one language from the other:** translation of convention text is not mechanical; a wrong word in a load-bearing phrase breaks `loops-check`.

## Consequences

- ✅ One file to edit per change; the identity test is deleted.
- ⚠️ A Vietnamese-docs repo that runs `/loops:update` receives English text inside its managed blocks (reading-order, guardrails, core, rituals). The repo-owned parts stay in its language.

## Related

INT-001 · SPEC-001 · ADR-0002
