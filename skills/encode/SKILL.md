---
name: encode
description: Turn one invariant boundary of a loops-managed repo into the smallest check the repo's own validation runs, with a positive and a negative proof, and record what enforces it on the ADR's "Enforced by" line. Use when the user says "encode this rule", "make the boundary a check", "biến rule này thành check", "enforce ADR-nnnn", when loops-check notes a boundary ADR without "Enforced by", or when /loops:review found a boundary that holds only as prose. NOT for writing the rule itself (/loops:spec, an ADR) and NOT for changing loops' own hooks (/loops:improve).
---

# /loops:encode — a boundary becomes a check, with proof in both directions

A boundary that exists only as a sentence is advice (playbook lesson 8; ADR-0004). This skill makes one boundary mechanical: the smallest check in the place the repo already runs its validation, a fixture that passes, a fixture that fails, and the ADR line that tells the next reader where to look (ADR-0006).

## Hard rules

1. **Authority first, always.** The rule must already be stated by an Accepted ADR, a product contract or AGENTS.md. No statement → this skill stops and files an `OPEN-nnn` row with a proposal; a check without authority is a policy you invented.
2. **The check lives where the repo already validates.** The existing test target, lint config, CI job or `loops-check`-style script of the repo — never a new runner, never a new dependency for one rule.
3. **A check without a negative proof is not done.** A fixture that violates the rule must fail with the diagnostic; a fixture that respects it must pass. Both are named by test id.
4. **The diagnostic names the authority and the way out.** "`apps/web/src/x.ts` imports `pg` directly; ADR-0009 keeps raw SQL inside `packages/db` — move the query there or add the path to the allow list in ADR-0009" is a diagnostic. "lint error" is not.
5. **Report the four enforcement levels separately, each with its own evidence** — local (you ran it, output pasted), hook (a Claude Code session only), CI (a job file is a declaration; say whether you saw it run), branch protection (unverified unless someone opened the remote's settings).
6. Never loosen an existing check to make the new one fit.

## Step 1 — Find the authority and write the boundary table

Read AGENTS.md's boundary line and its ADR. Write, before any code:

| Field | Value |
| --- | --- |
| Rule, in one sentence | |
| Authority | ADR-nnnn §Decision / `docs/product/<doc>` §… |
| Scope (paths, modules, data) | |
| Allowed | |
| Forbidden | |
| Exceptions (and who may grant one) | |
| Diagnostic the check will print | |

Missing authority → `OPEN-nnn` with a proposal, stop. An exception nobody has granted → `OPEN-nnn`, stop.

## Step 2 — Pick the smallest native check

Prefer, in order: a constraint the platform enforces (a type, a DB constraint, a config key) · a rule in a linter the repo already runs · a test in the existing suite that scans the tree · a line in the repo's own check script. The check reads the repo, decides, and prints the diagnostic; it does not fix. Name the owner of the check (the test file, the lint config) and its invoker (what runs it on push or in CI) — a check nothing invokes does not exist (L26).

## Step 3 — Proof in both directions

- **Positive:** a fixture (or the repo as it is) that respects the rule → the check passes. Test id `T-<area>-n`.
- **Negative:** a fixture that violates the rule → the check fails and prints the diagnostic from Step 1. Test id `T-<area>-n+1`. Run both; paste the output.

Write a story packet if the change exceeds a tiny intake class, with these two ids as its `proof` rows.

## Step 4 — Record

- The ADR's header gets `- **Enforced by:** <check> (T-…-n positive, T-…-n+1 negative) · declared in <hook / CI file / test target>`. `adr-guard` allows this line on an Accepted ADR; nothing else in the ADR changes.
- If AGENTS.md carried an imperative sentence for this rule, replace it with the pointer (ADR-0004: a rule that gets a check loses its sentence).
- `node scripts/loops-check.mjs` must print OK and no longer note this ADR.

## Step 5 — Report

```
Encoded: <rule> (ADR-nnnn)
Check: <file> · owner <test target / lint> · declared in <…>
Proof: T-…-n passed (positive) · T-…-n+1 failed as expected (negative) — output pasted below
Levels: local ✓ (ran) · hook — (none) · CI: declared in <file>, run on this branch: yes/no/not seen · branch protection: unverified
Not covered: <paths or branches the check cannot see, named plainly>
```

Reply in the user's language.
