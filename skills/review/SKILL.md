---
name: review
description: Milestone cross-review for a harness-managed repo — sweep the docs chain for internal consistency, then read the CODE that enforces each invariant and find the paths that route around it, and leave an immutable, impartial review snapshot in docs/reviews/ plus routed follow-ups (doc updates, ADRs, story packets). Use when the user wants to "review the project", "đánh giá / nhìn lại milestone", "review kỹ thuật", "lessons learned", "how far have we got", or when a milestone/gate closes. In a harness-managed repo, prefer this over any generic "retrospective" skill — this one NEVER creates living RETROSPECTIVE/STATUS docs (snapshot only). NOT for reviewing a code diff/PR (use code-review) or a single file.
---

# /loops:review — milestone cross-review, snapshot output

Look back at the milestone **honestly, structurally, and trackably**. No flattery; name the weak spots with evidence and rank by impact — but record strengths too, so later work doesn't break what's working.

**Output contract (differs from generic retros on purpose):** the deliverable is an **immutable snapshot** `docs/reviews/YYYY-MM-DD-<scope>.md` following `docs/templates/review.md`, plus follow-ups routed into the harness. Do NOT create living RETROSPECTIVE/STATUS files — that pattern was tried and abandoned in the source project (see the harness LESSONS.md, L6): history lives in each doc's changelog and in these snapshots.

## Gather first (before evaluating)

- **Previous snapshot's action list first** (latest `docs/reviews/*.md`, its priority-ordered actions): for each item, did it actually happen? Closed items should be visible in a doc changelog or an ADR; carry unresolved ones forward into the new report with their original F# noted. A review that never verifies its own follow-through produces complaints, not improvement.
- The whole chain: product contract ↔ roadmap ↔ ADRs ↔ AGENTS.md boundaries ↔ backlog ↔ TEST_MATRIX.
- Reality: `git log`, actual run results (**re-run commands if needed — don't trust memory or docs**), stub markers in code.
- **Build-cache replay is not evidence** (LESSONS.md L20): turbo/nx print the cached run's full output, test names included. Before accepting a run as acceptance evidence, check the `Cached: X/Y` summary line; when it matters, re-run with `--force`/0-cache. Record what you ran in the report's §0, including what you did **not** run — a silent omission reads as "all green".
- Classify every load-bearing claim in the report: **Authoritative** (a doc/ADR mandates it) / **Observed** (you ran it and saw it) / **Derived** (inferred from code or docs) / **Decision-Required** (nobody has decided) / **Unknown**. Never let a Derived claim wear Observed's clothes — the classification is what makes findings auditable.

### Splitting the read across parallel readers

A repo past a few thousand lines needs more than one reader. Give each reader a disjoint area (backend / frontend / data+domain packages / docs+tooling) by delegating to `.claude/agents/reviewer.md` (tools Read, Grep, Glob only — it cannot run anything) with the area and the gate results as its task, and hold two rules, both learned the expensive way (L27):

- **Readers do not run the gates.** The lead runs them once with `--force` and hands the result to every reader as a given. Otherwise each reader triggers its own build and reads back a cache replay — L20 multiplied by the number of readers.
- **Anything a reader reports is PLAUSIBLE until the lead opens the exact line.** Readers get the substance right and the coordinates wrong: expect off-by-tens line numbers and files attributed to the wrong directory. One bad coordinate sends the fixer to the wrong place and discredits the whole report, so promote to CONFIRMED only by opening the file yourself. Budget for this — it is the lead's real work, not a formality.

## Step 1 — consistency sweep

Report what's off; fix the mechanically-clear cases in the same pass (link fixes, counts), route the rest:

- [ ] Internal links between docs resolve.
- [ ] No tombstones in doc bodies; no history smuggled into status cells (TEST_MATRIX cell convention holds).
- [ ] One source of status: backlog emoji agrees with story-file Status lines.
- [ ] Claims match reality: counts, statuses, commands re-verified (AGENTS.md "common commands" actually run — the fastest-rotting section).
- [ ] Every AGENTS.md boundary still has its ADR; every ADR overtaken by reality has a drift note in `decisions/README.md`.
- [ ] Terminology consistent — one canonical definition per concept; other docs link, don't redefine.
- [ ] Every gate names its invoker, and no wired-but-unconsumed exports (L15/L16): for each "gate"/"mock"/"harness" module, something actually invokes it — a hook, a CI job the remote reads, an import edge. Grep consumers; run `scripts/loops-check.mjs` if present. Complete-looking artifacts with zero call sites are the class stub greps miss.
- [ ] Operational docs (wave prompts, temporary run guides) are within their expiry condition (L18) — one past it is actively steering agents wrong, not just stale.
- [ ] Approved numbers propagated (L19): for each decision that replaced a figure, grep the superseded value — it must survive only in changelogs and review snapshots.
- [ ] Generated blocks current and untouched by hand: `node scripts/loops-gen.mjs --check` passes; no story packet over its line budget (acceptance logs belong in PRs / here, L22).
- [ ] `docs/decisions/OPEN.md`: every `closed` row names where the decision was recorded, and is deleted in this review (the snapshot keeps it); every `open` row still blocks a live story — an orphan open row is a decision nobody is waiting for, close or drop it. Rows open longer than one milestone are a finding about the human loop, not the agent. A row whose own proposal names a deadline ("if longer than 30 days, do X") that has passed is a finding with a name attached: nobody owned the trigger.
- [ ] **Reasoned out-of-scope clauses are untested claims** (L29). Read the `Ngoài` / `Out of scope` section of every done story in the area under review. An exclusion that carries a *because* ("we skipped the UPDATE branch because both transactions compute the same value") is an engineering claim that no test ever checked — it was written to justify not writing the test. Re-derive each one; the ones that are wrong are wrong in exactly the area the story convinced everyone was safe.
- [ ] **Whatever cannot be recomputed has a restore proof** (L30). For each ADR naming a source of truth, find where its backup runs and when a restore was last performed. "The ADR says it matters" plus "no backup exists" is the highest-severity finding a review can produce, and it hides well: no doc contradicts another, so the docs sweep passes clean.

## Step 2 — code reality pass (invariants vs the code that enforces them)

The docs sweep proves the documents agree with each other. It cannot prove the code agrees with them, and that gap is where the expensive findings live: a repo can pass every harness gate, keep every generated table current, hold an honest TEST_MATRIX — and still violate its own load-bearing invariants (L24).

Start from the table the ADRs already carry: for every AGENTS.md boundary, its ADR's `- **Enforced by:**` line (ADR-0006) names the check, hook or test that holds it, or says `none yet — prose only`. Build that table first (boundary · ADR · enforced by · level: local / hook / CI / branch protection); a boundary with no line is a finding in its own right, routed to `/loops:encode`, and a line that names a test which does not exist is a worse one. Report each level only with its own evidence: a hook holds in a Claude Code session and nowhere else; a CI file in the repo is a declaration, not a run; branch protection is "unverified" unless someone opened the remote's settings.

Then, for each invariant in `AGENTS.md` / an ADR, open the code that enforces it and ask **"which path routes around this?"**:

- **Follow the enforcement to its edge, then one step further.** An invariant is usually enforced at one layer (a DB constraint, a guard, a unique key). The bug is upstream of it, where a caller supplies the input that makes the enforcement a no-op — a key that is regenerated per attempt never collides, so the idempotency constraint holds perfectly and de-duplicates nothing.
- **Enumerate the branches the story never named.** Ordering, retries, concurrency, clock skew, stale data arriving late, empty collections. A rule written for the common case ("the day after the last one") silently decides the cases nobody wrote down ("a day *before* the last one").
- **Read the caller, not only the definition.** Predicates that look equivalent to a human (`deleted_at IS NULL` vs `deleted = false`) are not equivalent to a query planner or to a partial index.
- **Check both tiers of anything duplicated by design.** Where an ADR mandates the same logic in two places (client and server, cache and source of truth), diff the actual behaviour rather than trusting the shared-module claim.

Cost control: this pass is scoped by the invariant list, not by the file count — you read the enforcement points, not the whole repo. Every finding here starts PLAUSIBLE and needs the exact line opened before it ships as CONFIRMED.

## Step 3 — evaluate (the review body)

Fill the `templates/review.md` sections. Within them, cover these dimensions, ranked by impact:

1. **Strengths to preserve** — short, specific, referenced.
2. **Findings** graded SEVERE / MEDIUM / MINOR, each a stable `F#` with `file:line` evidence, a **CONFIRMED / PLAUSIBLE** label, and ONE actionable recommendation. CONFIRMED means you opened that line yourself; nothing a delegated reader handed you is CONFIRMED until you did.
3. **Cross-consistency check** — examine each **pair** of documents (product ↔ roadmap, roadmap ↔ backlog, ADR ↔ code...). This is the most valuable part: cross-document contradictions (a Must depending on a Should, two clocks for one concept, orphan KPIs) never surface reading files one at a time.
4. **Near-misses** — things that went right by accident; they are future risks the good/bad split silently files under "good".
5. **Unverified assumptions** — what is inferred rather than run.
6. **Process lessons** — for each significant failure, 5-Whys until the cause enables a specific change; separate root cause from contributing factors; note the warning signs that were ignored.
7. **Priority-ordered actions** — each tagged [when] + F#; every action names how we'll verify it happened.

Blameless, controllable-first: ask "why did the process produce this outcome", not "who erred"; separate what was in our control from external conditions.

## Step 4 — route, don't hoard

A finding that stays in the report helps nobody. Route each accepted recommendation:

- Scope/behavior corrections → update the source doc + one changelog line (clean-docs rule: edit the body as if the new state were always true).
- New tradeoffs → new ADR; narrowed-but-alive ADRs → drift note in `decisions/README.md`.
- Recurring process failures → propose a concrete rule change in `AGENTS.md`/`LOOP.md` or a skill/hook tweak — a lesson only self-enforces once promoted into config. Keep to the 1–3 that would actually have changed this milestone.
- New work → story packets / backlog rows.

**Every finding closes in exactly one of three states** (L17): fixed in a routed diff · owned by a story/backlog row · refused by the human with the reason recorded. There is no fourth state — "acknowledged" is how the same finding gets caught twice by two reviews three days apart.

The snapshot itself is never edited afterward. The next review verifies this one's follow-through — that check runs first, before any new sweeping.

## Scale

Scale ceremony to the milestone: a small one gets Step 1 and a short findings list; the full shape — including the Step 2 code pass and parallel readers — is for gates, large doc changes, and any review the user asks for in technical terms. Reply in the user's language; the report is written in the repo's docs language.

A code finding is not routed by writing it down. Behaviour changes need a story packet (or a `proof` line on an existing one) like any other work — the review produces the diff or the packet, never a third state (L17).
