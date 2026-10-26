# ADR-0006 — A boundary's ADR names what enforces it, and the four enforcement levels are reported apart

- **Status:** Accepted
- **Date:** 2026-10-06
- **Supersedes / Superseded by:** —
- **Settles before:** SPEC-002, ST-009
- **Enforced by:** `loops-check` item 5b (a boundary ADR without the line is a note) · `test/run.mjs` T-ENF-1, T-ENF-2 · `docs/templates/decision.md` carries the field
- **Context:** ADR-0004 says every rule a hook can enforce is a hook. Nothing records, per boundary, *whether* that happened: AGENTS.md says "→ ADR-0004", the ADR says why, and the reader has to grep hooks and checks to learn what holds the rule. The review skill does that by hand at every milestone (Step 2, L24). repository-harness' `encoding-invariants` pattern (read 2026-10-06) names four enforcement levels and insists on claiming each only with its own evidence: "A checked-in CI job does not prove that it ran on the current revision. A green job does not prove branch protection requires it." loops' own reports blur this: `loops-check` prints `invoked from: .gitlab-ci.yml` as if that were the gate, and the land PR template says "Gates added: … invoked from …".

## Decision

1. **Every ADR that backs an AGENTS.md boundary carries `- **Enforced by:**`** naming the check, hook or test that holds the rule (ids where they exist), or `none yet — prose only`. The line is header metadata like `Status`, not body: `adr-guard` allows editing it on an Accepted ADR, the same way it allows the status flip.
2. **A boundary whose ADR has no such line is a `loops-check` note, not a failure** (OPEN-003). Reason: L28's rule for adoption signals; a failure would turn every consumer red on the version bump.
3. **Four enforcement levels, each claimed only with its own evidence**, in every report that talks about a gate (`loops-check` item 9, the `/loops:land` PR description, `/loops:review` Step 2, `/loops:encode`): *local* (a command a person can run now, with its output), *hook* (a Claude Code session with `.claude/settings.json`; nothing else), *CI* (a job the remote reads — its presence in the repo is not proof it ran on this revision), *branch protection* (verified only by someone with access to the remote's settings; otherwise "unverified").
4. **`/loops:encode <boundary>`** is how a boundary gets its line: authority first (the ADR or product doc that mandates it; no authority → an OPEN row, not a check), the smallest check in the repo's own test target, a positive and a negative proof (a fixture that must fail), the diagnostic naming the authority, then the `Enforced by:` line and the four levels in the report.

## Rejected options

- **Put the enforcement in AGENTS.md next to the boundary:** AGENTS.md has a 120-line budget and is the fastest-rotting file; the ADR is already the boundary's home.
- **Fail on a missing line:** OPEN-003, rejected for the reason in point 2.
- **Verify CI and branch protection from the repo:** not possible without the remote's API; claiming it would be exactly the blur this ADR removes.

## Consequences

- ✅ A reviewer opens the ADR and knows where to look; `/loops:review` Step 2 starts from a table instead of a grep.
- ✅ The words "invoked from" no longer imply a merge gate.
- ⚠️ Four more lines in each ADR header; the review checks they are still true.

## Related

INT-002 rows 2, 3, 6 · SPEC-002 · ST-009 · OPEN-003 · ADR-0004 · repository-harness `patterns/encoding-invariants.md`, ADR 0028 (external)
