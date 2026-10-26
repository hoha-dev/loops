# FEATURE_INTAKE.md — Classify work before coding

> Agent: run this classification BEFORE implementing any request. It decides how much ceremony is needed (story packet, ADR, test depth).

<!-- LOOPS:BEGIN authority (harness-owned block — /loops:update may replace it) -->
## The authority axis (check BEFORE sizing)

The 🟢🟡🔴 classes below only measure **size/risk**. A second, independent axis: **authority** — does this request force the agent to invent *product policy*?

- A request that requires inventing numbers, rules, or defaults not recorded in the product contract / ADRs → **STOP, add a row to `docs/decisions/OPEN.md` with a proposal and list its id under the story's `opens`**, whatever the class. A configurable default is not authority. A story with an unresolved OPEN is not Ready.
- Example: "Add rate limiting" → STOP (what limit? per tenant or per IP? — nobody decided). "Enforce the documented 20 req/min per user from RD §x" → authorized, proceed.
<!-- LOOPS:END authority -->

## 3 classes of work

### 🟢 Tiny — small fix, no behavior/contract change

Examples: copy tweaks, color change via token, typo fix, adding tests for existing code, single-file internal refactor.

- **Needs:** just do it + related tests green.
- **Doesn't need:** story packet, ADR.

### 🟡 Normal — add/change behavior within existing boundaries

Examples: one endpoint per the existing API design, one screen per the design handoff, a variant of an existing feature.

- **Needs:** story packet (`docs/stories/`), `TEST_MATRIX.md` update, clear AC.
- **Doesn't need:** ADR (unless a new tradeoff emerges).

### 🔴 High-risk — touches invariant boundaries / data / security / architecture

Generic examples: changing a source-of-truth data schema, changing auth/session mechanics, changing sync/migration strategy, adding a cross-boundary module dependency.

This project's high-risk areas:

- `template/scripts/*.mjs` (loops-gen, loops-check): every consuming repo's gate
- `template/.claude/hooks/*.mjs` and `template/.claude/settings.json`: what blocks an agent at edit time
- `loops-install-files.txt` and the `LOOPS:BEGIN/END` markers: what `/loops:update` may overwrite in a consuming repo
- the story front matter contract in `template/docs/templates/story.md`

- **Needs:** story packet + **an ADR with Status Accepted before the story is Ready** (a Proposed ADR blocks it — write the ADR at spec time, `/loops:spec`, and settle it with `/loops:sync`) + TEST_MATRIX update + Tech Lead review + tests for the invariants (cross-user/idempotency/migration... per area).
- **Warning:** if it contradicts an "Invariant boundary" in AGENTS.md → STOP, ask a human first.

## Quick decision tree

```
Touches template/scripts, template/.claude/hooks, loops-install-files.txt, LOOPS:BEGIN/END, story front matter?
  → YES → 🔴 High-risk
  → NO  → Changes user-facing behavior or adds an endpoint/screen?
           → YES → 🟡 Normal
           → NO  → 🟢 Tiny
```

## Checklist for every class

- [ ] Read the relevant parts of docs/product + docs/decisions.
- [ ] No "Invariant boundary" violated (AGENTS.md).
- [ ] Done: `node test/run.mjs && node scripts/loops-gen.mjs && node scripts/loops-check.mjs`.
