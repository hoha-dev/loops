---
id: INT-002
title: What loops should take from hoangnb24/repository-harness, and what it should not
author: TrungNguyen (owner), researched by the agent
status: accepted
opened: 2026-10-06
source: idea
spec: [SPEC-002]
---

# Intent: INT-002 — Ideas from repository-harness

<!-- Research read-out, written as an intent so the owner decides which items become a spec. Source:
     https://github.com/hoangnb24/repository-harness @ 485fd40 (2026-10-04), cloned and read on 2026-10-06
     (README, HARNESS.md, WORKFLOW.md, AGENTS.md, decisions 0019/0020/0024–0028, patterns/encoding-invariants.md,
     the five skills under .agents/skills, the Rust crate's cli/service/git_merge/filesystem_state/self_update,
     the three workflows, CHANGELOG). The predecessor harness already borrowed from an earlier version of this repo
     (its v0.2.0: "adopt upstream repository-harness ideas — update mechanics + executable contract"), so some
     of what follows is already in loops; those rows say so. -->

## Problem

repository-harness and loops answer different questions. repository-harness (one Rust binary, 26 payload files, 5 explicit-only skills) installs a *repository protocol*: the repo is the system of record, the consumer owns its workflow, no task database, no classification, no planning. Its latest commit removed even the task flows from its WORKFLOW.md. loops is the opposite scope: it *is* a workflow (intent → spec → story → land) with machine-checked states. So the question is not "which is better" but which of its mechanisms are better engineered than loops' equivalent, and whether taking them keeps loops' claim intact.

Read against loops v0.1, six mechanisms are better engineered there, two are already in loops, and three are deliberately not wanted. Row 9 is the owner's addition: the same loop has to hold across developers, not only across one developer's sessions.

## Proposed outcome

The owner accepts or closes each row below; accepted rows become SPEC-002.

| # | Mechanism in repository-harness (evidence) | loops today | Proposal | Size |
| --- | --- | --- | --- | --- |
| 1 | **Update keeps the exact upstream base.** `harness install` records every managed file's bytes under `.harness-core/base/<path>` + `manifest.json`; `harness update` runs `git merge-file -p --diff3` per file (BASE/LOCAL/UPSTREAM), stages conflicts under `.harness-core/update/{base,local,incoming,resolved,frozen}/` and never writes markers into live files; `--continue` refuses on drift or leftover markers; whole run is transactional with a backup (ADR 0024/0025, `git_merge.rs`, `filesystem_state.rs`). | `/loops:update` is an LLM diff over the manifest + `LOOPS:BEGIN/END` markers with no stored base, so it cannot tell "the consumer edited this managed file" from "upstream changed it". | Store the base: `/loops:init` writes `.loops/base/<managed path>` and `.loops/manifest.json` (plugin version + sha256 per file); add `scripts/loops-update.mjs` (node, no deps) that does the diff3 via `git merge-file` for managed files and block replacement for mixed files, stages conflicts under `.loops/update/`, applies all-or-nothing, and reports; `/loops:update` becomes the human-directed resolver of `resolved/` files. `loops-check` gains a `status` note: installed version vs plugin version, managed files modified locally (hash drift). | M (script ≈ 250 lines + 5 fixture cases + skill rewrite) |
| 2 | **An accepted invariant is encoded with positive and negative proof** (ADR 0028, `patterns/encoding-invariants.md`, `$encode-invariant`): authority first, smallest check in the repo's own validation owner, actionable diagnostic naming the authority, a forbidden fixture that fails, and the four enforcement levels reported separately — "A checked-in CI job does not prove that it ran on the current revision. A green job does not prove branch protection requires it." | AGENTS.md boundaries must have an ADR (checked); whether anything *enforces* the boundary is not checked. `/loops:review` Step 2 reads the enforcement by hand (L24). | New skill `/loops:encode <boundary>`: authority gate → boundary table (scope/allowed/forbidden/exceptions/diagnostic) → the smallest check in the repo's test target → positive + negative proof → report the four levels. ADR template gains `Enforced by:` (check + negative-proof test id) and `loops-check` notes an AGENTS.md boundary whose ADR has no `Enforced by` line. `/loops:review` Step 2 starts from that table. | S–M (skill + template field + 1 check item + 1 fixture) |
| 3 | **Enforcement levels in every report** — local validation / optional hook / CI / branch protection, each claimed only with its own evidence (`encoding-invariants.md` §5). | `loops-check` item 9 prints "invoked from: .gitlab-ci.yml" as if that were the gate; `/loops:land` prints "Gates added: … invoked from …". | Reword item 9 and the land PR template: "declared in <file> (CI presence is not proof it ran or blocks merge; branch protection unverified)". Hooks are "a convenience entrypoint" by this taxonomy — say so in LOOP.md §Hooks. | XS |
| 4 | **Improvement experiments have a file with the fields that keep them honest** (`templates/harness-improvement.md`, `$improve-harness`): representative job · baseline · earliest gap (Context / Capability / Domain ownership / Authority / Proof / Environment) · correct owner · intervention as a hypothesis with "Evidence that would weaken this" and "Maintenance owner and removal condition" · fresh rerun · Keep/Revise/Remove. | `/loops:improve` has the same loop (it was derived from an earlier version of this skill) but writes nothing until the LESSONS entry; "removal condition" and "evidence that would weaken" are missing. | `docs/templates/improvement.md` with those fields; `/loops:improve` writes `docs/reviews/YYYY-MM-DD-improve-<slug>.md` (a snapshot, like a review) and the LESSONS entry only on Keep. Every kept change names its removal condition — loops' hooks and checks included. | S |
| 5 | **Releases are mechanical**: a merged PR touching payload paths bumps the patch version and the release pointer, prepends a CHANGELOG entry, and publishes an immutable tag with checksummed assets; `premerge.yml` runs 12 contract scripts and `cargo test`; no `continue-on-error` anywhere (`post-merge-maintenance.yml`, `harness-release.yml`). | `plugin.json` version is edited by hand; no CHANGELOG; nothing checks that a `template/` or `skills/` change bumped the version. | `CHANGELOG.md`; a fixture case in `test/run.mjs` for this repo only: if `git diff origin/main..HEAD -- template skills` is non-empty then `plugin.json` version must differ from `origin/main`'s; `ci/github-loops.yml` already has the contract job — add the version check there for the loops repo. No binary, no tags: the plugin is installed from git. | S |
| 6 | **Onboarding is read-only first and classifies every claim**: Authoritative / Observed / Derived / Decision required / Unknown, with an "invariant vs check inventory" (Enforced / Partially enforced / Unenforced rule / Check lacking authority / Unknown) and the rule "Never silently promote … to Authoritative" (`$onboard-repository` step 2, 2a). | The five-way classification is already in `/loops:review` (Gather). `/loops:init` scans and interviews but does not produce the invariant-vs-check inventory. | Add the inventory table to `/loops:init` Step 1 (scan) and Step 4 (hand over): for every candidate boundary, whether a check exists today, so ADR-0001…n are written with `Enforced by:` filled or marked "none yet". Pairs with row 2. | S |
| 7 | `AGENTS.md` is 24 lines; the whole installed guidance is "load the smallest useful context". | 70 of a 120-line budget; the budget is checked. | Already in loops (budget + hooks replacing sentences). No change. | — |
| 8 | "A plan, checklist, or completion message is not behavior-level proof." Evidence sections distinguish exercised / failed / unverified. | L20, L25, review §0, PR description with `Cached: X/Y`. | Already in loops. No change. | — |
| 9 | **Several developers, not only several sessions** (added by the owner on 2026-10-06 while accepting this intent). repository-harness has nothing here: it has no task state at all. loops' claim mechanism reads `refs/remotes/*` already, but `/loops:start` pushes the branch only "when sessions run on other machines", nothing fetches before a wave, ids (`OPEN-nnn`, `INT-nnn`, `ST-nnn`) are allocated from the local folder, and `owns-guard` lets any story edit any Proposed ADR or spec (self-review F3). | Two developers who each run `/loops:wave` from their own clone can be handed the same story, allocate the same `OPEN-004`, and edit each other's Proposed ADR, and nothing fails until the merge. | A claim is a **pushed** branch: `/loops:start` pushes right after creating it; `/loops:wave`, `/loops:next` and `/loops:start` fetch first (`loops-gen --claims --fetch`); `loops-check` notes when the remote refs were last fetched more than a day ago. Ids come from `loops-gen --next-id <kind>`, which scans main and every remote branch; `loops-check` fails on a duplicate id after a merge. `owns-guard` allows under `docs/decisions/`, `docs/intents/`, `docs/specs/` only `OPEN.md` and files that do not exist yet. LOOP.md gets a "several developers" section: fetch, push the claim, one story per branch, merge order for the generated tables. | M |

## Affected users and systems

The owner; project B (first `/loops:update` consumer: row 1 decides whether that update is a merge or a hand diff); the loops repo's own release process (row 5).

## Constraints

Plain node, no Rust, no Python, no new runtime: repository-harness' evidence-capsule tooling (`emit_evidence_bundle.py`, `render_patch.py`, `validate_evidence_capsule.py`, Codex JSONL transcripts) is out of reach and out of scope. Nothing from the Rust crate is ported as code; only the algorithm (diff3 over a stored base, staged conflicts, all-or-nothing apply) is reimplemented with `git merge-file`, which every consumer already has.

## Out of scope

- **Explicit-only skills and "the harness does not classify tasks"** (ADR 0026, 0028, commit 485fd40): loops' value is the classification and the computed states; adopting this would remove the product. Not needed because the two repos answer different questions (Problem above).
- **The evidence capsule** (hash-pinned claims, rendered patches, transcript-aware validator): built for an onboarding proposal audited by a second agent from a Codex transcript; loops' equivalent is the review snapshot with CONFIRMED/PLAUSIBLE and `file:line`, read by a person. Not needed because the only reader today is the owner, and the tooling is Python + Codex-specific.
- **engineering-wisdom** (19 heuristics from Robert C. Martin's books, opt-in): advice, not mechanism; one heuristic ("make automation failure honest: no warning-and-exit-0") is already loops' note/failure split with its reason recorded (L28). Not adopted.
- **Self-updating binary with release identity checks**: loops is a git-installed plugin; no binary to verify.

## Open questions

- OPEN-002 — Row 1: implement the stored-base update now (before project B migrates) or migrate project B by hand first and build the updater from that experience? Decided 2026-10-06: build it first (SPEC-002, ADR-0005).
- OPEN-003 — Row 2: does `loops-check` *fail* or *note* a boundary whose ADR has no `Enforced by:`? Decided 2026-10-06: note (ADR-0006).
