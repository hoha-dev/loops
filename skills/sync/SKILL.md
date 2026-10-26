---
name: sync
description: Propagate a settled decision through every document that asserts the old state — flip the ADR from Proposed to Accepted, close the OPEN row, rewrite each assertion as current state, bump the owning doc's version and changelog, and verify no stale phrasing or number survives. Use when the product owner has just decided something: "chốt rồi, cập nhật tài liệu", "PO đã duyệt X", "lan quyết định này ra docs", "sync lại docs", "the decision is X, propagate it", or right after /loops:spec's points were settled. NOT for packaging new work (story packet), not for a milestone lookback (/loops:review), not for a routine edit to one doc that nothing else asserts.
---

# /loops:sync — one decision, every assertion, one pass

A decision recorded in one file while three others still assert the old state is worse than no decision: the next agent reads whichever file it opens first. This skill closes that gap and leaves the repo internally consistent, with the machine-readable fields (ADR status, OPEN status, spec `opens`/`adrs`) flipped so `loops-check` sees the decision too.

## Step 1 — State the decision and place it

One sentence, then the owner doc — where the decision is *asserted*; everything else refers to it:

| Kind of decision | Owner | Also touches |
| --- | --- | --- |
| Product scope, requirement, policy number | `docs/product/` (bump version + changelog) | specs, stories, TEST_MATRIX |
| Architecture / tradeoff with alternatives | the ADR in `docs/decisions/` (`Proposed` → `Accepted`, date) | `AGENTS.md` boundaries, `FEATURE_INTAKE` high-risk areas, specs, stories |
| Cross-cutting technical fact (stack, versions, layout) | `AGENTS.md` + `docs/architecture/` | every story that names it |
| A detail inside one spec or story | that file only | usually nothing |

Two hard rules: **never edit an Accepted ADR's body** — supersede it with a new ADR and add a drift note in `docs/decisions/README.md` (the `adr-guard` hook blocks the edit anyway). And a decision that **contradicts an invariant boundary** in `AGENTS.md` is a boundary change: stop and confirm with the human before touching anything.

## Step 2 — Flip the machine-readable state first

- ADR: `- **Status:** Accepted`, today's date; add the row to the index in `docs/decisions/README.md`. If it is a boundary, add the bullet to `AGENTS.md` "Invariant boundaries" ending in `→ ADR-nnnn` (mind the 120-line budget: replace, do not append).
- OPEN row: `status` → `closed`, "Recorded at" → the file and section that now holds the decision. The row is deleted at the next review, not now.
- Spec: remove the id from `opens` / keep the ADR in `adrs`; the spec may now be accepted by the PO.

## Step 3 — Find every assertion, not every mention

Grep for the concept **and its synonyms, in every language the docs use**, plus the numbers that encode it:

- the concept's own words;
- **counts and enumerations in prose** ("10 tables", "9 screens") — the highest-drift text in any repo;
- version strings, package names, path shapes;
- index rows and summary tables that restate the thing.

Distinguish an **assertion** (must change) from a **historical record** (`docs/reviews/*`, changelog rows, superseded ADRs — must not change; rewriting history is how a repo loses its audit trail).

## Step 4 — Rewrite as current state

- No tombstones: no "(removed)", "~~old~~", "was X, now Y" in body text. The delta is one changelog row.
- Bump versions where the doc owns the change; convert relative dates to absolute.
- Propagate consequences, not only wording: a data-model decision usually implies a schema, a seed format, an acceptance scenario. Per affected file ask: *would someone implementing from this file now build the right thing?*
- A replaced number is grepped to zero outside history files (LOOP.md rule 9).

## Step 5 — Verify

1. Re-grep the old phrasing and the old numbers — zero hits outside history files.
2. `node scripts/loops-gen.mjs && node scripts/loops-check.mjs` — OK.
3. `git status --short` — the changed set is what you intended; stage exact paths.

## Output shape

```
**Decision:** <one line> (settled <date>)

| File | Change |
| --- | --- |
| <path> | <one clause> |

**Verified:** loops-check OK · 0 stale mentions of <old phrasing>
**Left open:** <what still needs the human, or "nothing">
```

Reply in the user's language. A consequence that needs a decision you do not have authority for goes under **Left open**, never guessed.

## Scale

A decision confined to one story: edit that file, one line of report. The full sweep is for decisions that touch the product contract, the architecture, or a fact repeated across files.
