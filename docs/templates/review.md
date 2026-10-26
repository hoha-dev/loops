# Review — [scope]: [docs + code examined]

> Date: YYYY-MM-DD · Reviewer: [role] · Scope: [files/directories read] · Commit: [hash + working-tree state]
> Nature: impartial review — records strengths as well as problems, with concrete references for traceability.
> Method: [docs cross-read · code-vs-invariant pass · who read which area]

## 0. Evidence actually run today

<!-- This section separates "ran it and saw X" from "inferred X from code/docs". Without it the two
     blend and the whole report loses its value as acceptance evidence.
     A build-cache replay prints exactly like a real run (turbo/nx reprint test names and all):
     evidence must be a 0-cache/`--force` run, and the last column records the `Cached: X/Y`
     line you actually saw. -->

| Command | Result | Cache |
| ------- | ------ | ----- |
|         |        | `Cached: 0/N` |

**Not run in this pass:** [list them plainly — suites needing infrastructure, e2e, native builds. Leaving this empty invites the reader to infer that everything was green.]

## 1. Overall conclusion

[2-3 paragraphs: overall quality against the bar, where the biggest risk sits. Include a quick per-area score table if useful.]

## 2. Strengths to preserve

[Numbered. Strengths with references — so later work doesn't accidentally break what's working.]

## 3. Findings — SEVERE

<!-- Each finding: a stable F# code, a description referencing file:line, and ONE actionable
     recommendation. Each finding carries a verification label:
       CONFIRMED — the report's author opened that exact line and saw the behaviour described.
       PLAUSIBLE — inferred from code/docs, not run or not re-opened to confirm.
     A finding reported by another reviewer (or a subagent) is PLAUSIBLE until the lead opens the
     line: the substance is usually right but the file:line coordinates often are not, and one wrong
     coordinate sends the fixer to the wrong place and discredits the whole report. -->

### F1 · [title] — CONFIRMED | PLAUSIBLE

[Description + evidence, with `file:line`.]

- **Recommendation:** ...

## 4. Findings — MEDIUM

[Same F# format.]

## 5. Findings — MINOR

| #   | Issue | Reference |
| --- | ----- | --------- |

## 6. Cross-consistency check

<!-- The most valuable part of the review: examine each PAIR, because contradictions never surface
     when reading files one at a time. Two kinds of pair — do not skip the second:
       docs ↔ docs — a Must depending on a Should, two definitions of one concept, orphan KPIs.
       ADR ↔ code  — for each invariant in AGENTS.md/an ADR, open the code enforcing it and ask
                     "which path routes around this?". An invariant with an ADR, a test AND a gate
                     still gets violated on a branch nobody enumerated — a docs sweep never sees it
                     because no document is contradicted. -->

| Pair (docs ↔ docs · ADR ↔ code) | Result |
| ------------------------------- | ------ |

## 7. Recommended actions in priority order

[Numbered, each line tagged with [when] + F# codes.]

---

_This report is a snapshot as of [date], not a living doc. Resulting decisions → update the source doc (bump its version) or add an ADR through the existing process._
