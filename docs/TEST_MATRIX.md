# TEST_MATRIX.md — Behavior → Proof

> The verification control board. Every important behavior maps to its proof of "done". Rows in the generated block below come from `proof:` in each story's front matter — edit the story and run `node scripts/loops-gen.mjs`; never edit that block by hand.

## Proof notation

`unit` = unit test · `e2e` = end-to-end · `manual` = hand/QA check · `a11y` = axe/Lighthouse

## Status cell convention (mandatory)

A **Status** cell may contain only: `☐` / `🟡` / `✅` + at most one pointer `→ ST-xxx`.
NO history, explanations, or sub-task lists in cells — those details live in the story packet.
🟡 must carry a pointer to the story that records what's missing. The generated block follows this by construction.

## Behaviors by domain

The domain code is the middle segment of the ID (`T-<DOM>-n`). Spell out codes here when they are not self-explanatory:
`CORE` = loops-gen / loops-check · `HOOK` = PreToolUse hooks · `SKL` = skills · `DOC` = templates and docs · `CI` = workflow templates

<!-- LOOPS:GEN test-matrix -->
### CI

| ID | Behavior | Proof | Status |
| --- | --- | --- | --- |
| T-CI-1 | node evals/check.mjs passes a result whose text contains every expected string and is_error is false, and fails otherwise, without jq | `unit` | ✅ |
| T-CI-2 | evals/skills/*.json holds one eval per shipped skill with three phrasings each (one Vietnamese), and evals/run.sh runs them with claude --bare -p and records pass rate and total cost to evals/last-run.md (smoke run 2026-10-06: 1 phrasing of next through --plugin-dir, PASS, 1.55 USD; the full 33-phrasing suite was not run) | `manual` | ✅ |
| T-CI-3 | template/ci/github-loops.yml and template/ci/gitlab-ci.yml call loops-gen --check and loops-check on every push, and the evals on changes under .claude/** and skills; neither has continue-on-error | `manual` | ✅ |
| T-CI-4 | evals/last-run.md records a run of every evals/skills/*.json phrasing, with mode, date, pass count and cost per phrasing | `unit` | ☐ → ST-017 |

### CORE

| ID | Behavior | Proof | Status |
| --- | --- | --- | --- |
| T-CORE-1 | node test/run.mjs builds a repo from template/ and every ported case passes (15 cases) | `unit` | ✅ |
| T-CORE-2 | No identifier of the old product remains in shipped files (grep for harness-check, harness-gen, HARNESS:, h-*, the predecessor harness is empty outside LESSONS.md history) | `manual` | ✅ |
| T-CORE-3 | The repo root runs loops-gen and loops-check on its own docs through the one-line wrappers, and the pre-push hook calls both | `manual` | ✅ |
| T-CORE-4 | A high-risk story whose adrs list contains an ADR with status Proposed is not Ready; the backlog's Blocked by column names the ADR | `unit` | ✅ |
| T-CORE-5 | A normal story with a Proposed ADR gets a note, not a failure | `unit` | ✅ |
| T-CORE-6 | An ADR file without a Status line is treated as Proposed and the check says so | `unit` | ✅ |
| T-CORE-7 | loops-check fails when .claude/settings.json names a hook script that does not exist, and notes when settings.json has no hooks block | `unit` | ✅ |
| T-CORE-9 | on macOS/Linux a .githooks/pre-push without the executable bit does not count as invoker, and the note names chmod +x | `unit` | ✅ |
| T-CORE-10 | a .githooks hook committed as mode 100644 is noted with "git update-index --chmod=+x" even where this clone runs it | `unit` | ✅ |

### DOC

| ID | Behavior | Proof | Status |
| --- | --- | --- | --- |
| T-DOC-1 | A story whose trace names a spec with status draft is not Ready; loops-check names the spec | `unit` | ✅ |
| T-DOC-2 | A story whose trace names a SPEC-nnn or INT-nnn that has no file fails loops-check with the missing id | `unit` | ✅ |
| T-DOC-3 | A spec with status accepted and a non-empty opens list fails loops-check (accepted means every point is resolved) | `unit` | ✅ |
| T-DOC-4 | template/REVIEW.md has three passes (bugs, security, compliance with the story AC and ADRs), the Important/Nit definition, a nit cap, and excludes LOOPS:GEN blocks and what loops-check already verifies | `manual` | ✅ |
| T-DOC-5 | README.md installs the plugin in three commands and shows one full loop (intent → spec → wave → start → land → review) with the command for each step | `manual` | ✅ |
| T-DOC-6 | docs/WORKFLOW.md walks the six stages, naming for each the artifact, the skill, the gate (hook / check / human), and the playbook lesson it comes from | `manual` | ✅ |
| T-DOC-7 | README, WORKFLOW and DESIGN describe /loops:encode, loops-update, the four enforcement levels and the several-developers rules, with the test counts of this run | `manual` | ✅ |

### ENF

| ID | Behavior | Proof | Status |
| --- | --- | --- | --- |
| T-ENF-1 | loops-check notes an ADR referenced from an AGENTS.md boundary that has no "Enforced by:" line, and is silent once the line exists | `unit` | ✅ |
| T-ENF-2 | loops-check item 9 prints "declared in" with the sentence that CI presence is not proof of a run and branch protection is unverified | `unit` | ✅ |
| T-ENF-3 | an ADR named in AGENTS.md outside a "→ ADR-nnnn" boundary line gets no Enforced-by note; an AGENTS.md with no such line still has every reference checked | `unit` | ✅ |

### HOOK

| ID | Behavior | Proof | Status |
| --- | --- | --- | --- |
| T-HOOK-1 | owns-guard denies an Edit outside the active story's owns and allows one inside, reading the story from the hook's cwd | `unit` | ✅ |
| T-HOOK-2 | stage-guard denies (JSON permissionDecision, exit 0) git add -A, git add ., git commit -a and allows git add <path> | `unit` | ✅ |
| T-HOOK-3 | generated-guard denies an Edit whose old_string falls inside a LOOPS:GEN block and allows one outside it | `unit` | ✅ |
| T-HOOK-4 | adr-guard denies an Edit to an ADR whose Status is Accepted and allows a Write of a new ADR file | `unit` | ✅ |
| T-HOOK-5 | fix-guard denies an Edit to a test file when LOOPS_FIX_TASK=1 and allows it otherwise | `unit` | ✅ |
| T-HOOK-6 | Every hook answers an empty or malformed stdin with exit 0 (never blocks on its own failure) and runs under 300 ms including node start-up (measured by the fixture) | `unit` | ✅ |
| T-HOOK-7 | owns-guard on branch story/ST-019 allows a Write of a new docs/decisions/ADR-0003-x.md and an Edit of docs/decisions/OPEN.md, and blocks an Edit of the existing Proposed docs/decisions/ADR-0002-x.md | `unit` | ✅ |
| T-HOOK-8 | adr-guard allows an Edit whose old_string is the "Enforced by" line of an Accepted ADR and still blocks a body edit | `unit` | ✅ |
| T-HOOK-9 | stage-guard allows git add -A on main and outside any repo, and blocks it on a story/ST-xxx branch | `unit` | ✅ |

### ISO

| ID | Behavior | Proof | Status |
| --- | --- | --- | --- |
| T-ISO-1 | this repo's .githooks/pre-push, run by git push from a linked worktree, leaves the main repo's refs and config unchanged; the same hook without its env-clearing line changes them | `unit` | ✅ |
| T-ISO-2 | test/git-env.mjs removes every variable git rev-parse --local-env-vars lists, so a git init and git config in a temp dir started with GIT_DIR pointing at a sentinel repo leave the sentinel unchanged | `unit` | ✅ |
| T-ISO-3 | test/run.mjs, test/hooks.mjs and test/release.mjs import test/git-env.mjs before any other import | `unit` | ✅ |

### PAR

| ID | Behavior | Proof | Status |
| --- | --- | --- | --- |
| T-PAR-1 | with a bare remote and two clones, a story branch pushed from clone A is listed by loops-gen --claims --fetch in clone B and makes an overlapping in-progress story fail loops-check there | `unit` | ✅ |
| T-PAR-2 | loops-gen --next-id OPEN returns one more than the highest id found on main and on a remote branch that is not merged; --next-id ST, INT, SPEC, ADR likewise | `unit` | ✅ |
| T-PAR-3 | loops-check fails on two intent files sharing one id and on an OPEN id listed twice, naming both locations; it notes when FETCH_HEAD is older than one day and a remote exists | `unit` | ✅ |

### REL

| ID | Behavior | Proof | Status |
| --- | --- | --- | --- |
| T-REL-1 | test/release.mjs fails when CHANGELOG.md's first entry, .claude-plugin/plugin.json version and the root docs/LOOP.md LOOPS_VERSION disagree, and passes on this repo | `unit` | ✅ |
| T-REL-2 | test/release.mjs fails when a diff against the upstream ref touches template/, skills/ or loops-install-files.txt while plugin.json version is unchanged; without an upstream ref it prints that the comparison was skipped | `unit` | ✅ |

### SKL

| ID | Behavior | Proof | Status |
| --- | --- | --- | --- |
| T-SKL-1 | /loops:intent ends a design dialogue by writing docs/intents/INT-nnn.md and OPEN rows, never a DECISIONS.md | `manual` | ✅ |
| T-SKL-2 | /loops:spec writes a spec whose "Points a person has to decide" section is non-empty or says none, and registers each point as OPEN or Proposed ADR | `manual` | ✅ |
| T-SKL-3 | /loops:wave lists Proposed ADRs next to open OPEN rows in its "one PO sitting would unlock" paragraph | `manual` | ✅ |
| T-SKL-4 | /loops:start opens the reading step in plan mode and prints the working contract with the active hooks before any edit | `manual` | ✅ |
| T-SKL-5 | /loops:land step 5 runs the review from REVIEW.md on the diff through the reviewer subagent and attaches the findings to the PR description, without the findings approving or blocking anything | `manual` | ✅ |
| T-SKL-6 | /loops:review names .claude/agents/reviewer.md as the parallel reader and keeps the rule that readers do not run the gates (L27) | `manual` | ✅ |
| T-SKL-7 | /loops:improve step 5 ("fresh rerun") points at the eval runner instead of describing a manual rerun | `manual` | ✅ |
| T-SKL-8 | /loops:update recognises a repo on the predecessor harness (HARNESS: markers, HARNESS.md) and migrates markers, file names and the invoker before diffing | `manual` | ✅ |
| T-SKL-9 | skills/encode/SKILL.md walks authority → boundary table → smallest check → positive and negative proof → Enforced by line → four levels; evals/skills/encode.json has three phrasings | `manual` | ✅ |
| T-SKL-10 | docs/templates/improvement.md has the fields representative job · baseline · earliest gap (one of six kinds) · owner · hypothesis "If X at Y then a fresh agent will Z because M" · evidence that would weaken it · maintenance owner and removal condition · fresh rerun · verdict; /loops:improve writes docs/reviews/YYYY-MM-DD-improve-<slug>.md from it and adds the LESSONS entry only on Keep | `manual` | ✅ |
| T-SKL-11 | skills/init/SKILL.md names one English template, no Vietnamese canonical tree and no mirror | `manual` | ✅ |
| T-SKL-12 | skills/init/SKILL.md Step 3 rewrites "This repo's foundation checklist" in docs/LOOP.md from the SAD and the ADRs it generated, one seam per line with its ADR, and Step 4 checks that none of the shipped example lines is left | `manual` | ✅ |
| T-SKL-13 | skills/start/SKILL.md says the claim is visible to other clones once the start commit is pushed, not when the empty branch is pushed | `manual` | ✅ |
| T-SKL-14 | skills/land/SKILL.md Step 5 runs the review through the reviewer subagent on a saved diff, with no claude -p call and no ANTHROPIC_API_KEY, and the lead opens each line before calling a finding CONFIRMED | `manual` | ✅ |

### UPD

| ID | Behavior | Proof | Status |
| --- | --- | --- | --- |
| T-UPD-1 | init writes .loops/manifest.json (version, kind and sha256 per managed/mixed file) and .loops/base/<path>; status prints "current" right after | `unit` | ✅ |
| T-UPD-2 | apply with an upstream change and no local edit rewrites the managed file, updates base and manifest version, exit 0 | `unit` | ✅ |
| T-UPD-3 | apply with a local edit in another region than the upstream change keeps both lines (diff3 clean merge) | `unit` | ✅ |
| T-UPD-4 | apply with overlapping edits exits 2, writes nothing to the live file, stages base/local/incoming/resolved under .loops/update/; --continue refuses while markers remain and applies once resolved; --abort removes the staging dir | `unit` | ✅ |
| T-UPD-5 | a mixed file gets only its LOOPS:BEGIN/END block merged and the bytes outside the markers are byte-identical afterwards; a seeded file is never read or written | `unit` | ✅ |
| T-UPD-6 | a path listed in manifest.frozen is skipped by apply and not reported by status; loops-check notes a managed file whose sha differs from its base and a manifest version that differs from LOOPS_VERSION | `unit` | ✅ |
| T-UPD-9 | a mixed file with two blocks changed upstream, one conflicting locally, stages the conflicting block and carries the clean one; after --continue both upstream changes are in the file | `unit` | ✅ |
| T-UPD-10 | a managed file with no stored base whose local text differs from upstream is staged as a conflict, never reported unchanged | `unit` | ✅ |
| T-UPD-11 | init on a repo whose files already exist records a base only for files byte-equal to the template; the next apply stages every other differing file | `unit` | ✅ |
| T-UPD-12 | every file listed as mixed in loops-install-files.txt has at least one LOOPS:BEGIN block in template/ | `unit` | ✅ |
| T-UPD-13 | apply with no managed file to touch succeeds while an unrelated file is dirty | `unit` | ✅ |
| T-UPD-14 | apply that finds a mixed file without a block's markers stages nothing, exits 1, and names the block, the template file to copy it from, and "commit, then re-run apply" | `unit` | ✅ |
| T-UPD-15 | init records the template as base for a file the install merged into (fresh install); init --migrate records no base for it, and status names it | `unit` | ✅ |
| T-UPD-16 | re-running init on an installed repo keeps the stored base of a file edited since install, so the next apply is a three-way merge | `unit` | ✅ |
| T-UPD-17 | with no stored base, an upstream that empties a file or block is a conflict, not a silent keep | `unit` | ✅ |
| T-UPD-18 | a mixed file checked out with CRLF line endings has its blocks found and merged | `unit` | ✅ |
| T-UPD-19 | status does not count a manifest path the plugin template does not ship as a file without a base | `unit` | ✅ |
<!-- LOOPS:GEN-END test-matrix -->

## Behaviors without an owning story

<!-- Hand-written rows are only for behaviors that predate the harness or have not been split into a story yet.
     Once a story takes one, move the row into that story's proof and delete it here. -->

| ID      | Behavior             | Proof  | Status |
| ------- | -------------------- | ------ | ------ |
