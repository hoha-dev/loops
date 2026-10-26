# TEST_MATRIX.md — Behavior → Proof

> The verification control board. Every important behavior maps to its proof of "done". Rows in the generated block below come from `proof:` in each story's front matter — edit the story and run `node scripts/loops-gen.mjs`; never edit that block by hand.

## Proof notation

`unit` = unit test · `e2e` = end-to-end · `manual` = hand/QA check · `a11y` = axe/Lighthouse
<!-- loops-init: add/remove proof kinds per project (device, load, security...). -->

## Status cell convention (mandatory)

A **Status** cell may contain only: `☐` / `🟡` / `✅` + at most one pointer `→ ST-xxx`.
NO history, explanations, or sub-task lists in cells — those details live in the story packet.
🟡 must carry a pointer to the story that records what's missing. The generated block follows this by construction.

## Behaviors by domain

The domain code is the middle segment of the ID (`T-<DOM>-n`). Spell out codes here when they are not self-explanatory:
{{DOMAIN_GROUP_1}}
<!-- loops-init: e.g. "`SET` = Settings · `SRS` = review scheduling". Delete the slot if the codes speak for themselves. -->

<!-- LOOPS:GEN test-matrix -->
<!-- LOOPS:GEN-END test-matrix -->

## Behaviors without an owning story

<!-- Hand-written rows are only for behaviors that predate the harness or have not been split into a story yet.
     Once a story takes one, move the row into that story's proof and delete it here. -->

| ID      | Behavior             | Proof  | Status |
| ------- | -------------------- | ------ | ------ |
| T-XXX-0 | {{BEHAVIOR_EXAMPLE}} | `unit` | ☐      |
