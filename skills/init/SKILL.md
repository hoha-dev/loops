---
name: init
description: Bootstrap the agent-harness docs framework into a repo (new or existing) — interview the user / scan the code, then generate AGENTS.md, CLAUDE.md and the docs/ skeleton with all context slots filled. Use when the user says "init harness", "set up the harness", "áp harness vào repo này", or wants the AGENTS.md/FEATURE_INTAKE/ADR/story-packet structure installed in a project.
---

# loops:init — bootstrap the harness into a repo

Generate a filled-in harness (not a pile of placeholders) for the repo in the current working directory. The template lives in this plugin at `${CLAUDE_PLUGIN_ROOT}/template/` (Vietnamese, canonical) and `${CLAUDE_PLUGIN_ROOT}/template/` (English mirror); the harness version is the `version` field of `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` — the single version source. (When run outside a plugin install, resolve those paths relative to this file: `../../`.)

## Hard rules

1. **Never overwrite ANY existing file — the guard is per-file, not per-repo.** Before generating, list every path the template would create and check each against the target. A path that already exists (`CLAUDE.md`, `docs/README.md`, `.gitattributes`, anything) is NEVER copied over: merge the harness content into it (e.g. append the `@AGENTS.md` import to an existing CLAUDE.md, add rows to an existing docs/README.md table) or, when merging isn't obvious, leave it untouched and report it. Show the user the collision list with your merge plan BEFORE writing anything. If `AGENTS.md` or `docs/LOOP.md` already exists, the repo already has a harness — stop and offer to fill only the missing pieces.
2. **Every invariant boundary must be backed by an ADR you also generate.** No boundary enters AGENTS.md without one. Conversely, never invent a boundary the user didn't confirm.
3. **No leftover slots.** The generated repo must contain no `{{...}}` and no `<!-- loops-init: ... -->` comments. Those markers are for you, not for the output.
4. The generated docs describe the current state only — no "TBD" sections; omit a section rather than stub it.

## Step 1 — Scan before asking

Read the target repo first; don't ask what the code can tell you:

- `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` + lockfiles → stack, commands, verify commands (test/lint/typecheck scripts, CI workflow steps).
- `README.md`, existing docs → project one-liner.
- Repo layout (monorepo? services? schema files? auth code?) → **candidate** invariant boundaries and high-risk areas to propose in the interview.
- For each candidate boundary, what already enforces it: a lint rule, a test, a CI job, a hook, a DB constraint — or nothing. Write the **invariant-vs-check inventory** before the interview, one row per candidate: rule · where it is stated (a doc, a comment, nowhere) · what checks it today (file + level: local / hook / CI / branch protection) · state (enforced · partially · unenforced rule · check without a stated rule). Classify what you read, do not fix it: discovery grants no authority to change anything. The table is shown in the interview and decides the `Enforced by:` line of each ADR in Step 3.
- Empty repo (no code yet) → skip scanning; everything comes from the interview.

## Step 2 — Interview

Ask only what the scan couldn't answer. Confirm what it could. Collect:

| Input | Maps to slots | Notes |
| ----- | ------------- | ----- |
| Project name + one-liner | `PROJECT_NAME`, `PROJECT_ONELINER` | 2–4 sentences, no marketing |
| Docs language | choice of template | VI → `template/`, EN → `template/`; another language → translate from EN |
| Settled stack + its rationale | `STACK` + ADR-0001 | if the stack isn't settled, ADR-0001 stays `Proposed` |
| 3–7 invariant boundaries | `BOUNDARIES`, `HIGH_RISK_AREAS`, `HIGH_RISK_KEYWORDS` | propose candidates from the scan; each confirmed boundary gets a short ADR. Starting with 1–3 is fine — boundaries grow with ADRs |
| Dev + verify commands | `COMMANDS`, `VERIFY_COMMANDS` | verify against package.json/CI, don't copy blindly |
| Extra repo rules | `EXTRA_RULES` | cross-platform, i18n, generated code... delete slot if none |
| First behavior domain(s) | `DOMAIN_GROUP_1`, `BEHAVIOR_EXAMPLE` | seeds TEST_MATRIX with real rows, not lorem ipsum |
| Product/tech doc names | `PRODUCT_DOC`, `TECH_DOC` | if none exist yet, point the map at the file the user intends to write first |

Use one question per genuine decision (multiple-choice where possible); batch factual gaps into one numbered list.

## Step 3 — Generate

1. Copy the template tree into the target repo root — `AGENTS.md`, `CLAUDE.md`, `REVIEW.md`, `docs/` (with `intents/`, `specs/`, `decisions/`, `stories/`, `reviews/`, `templates/`), `scripts/`, `.claude/settings.json`, `.claude/hooks/`, `.claude/agents/`, `evals/`, `ci/` — applying the per-file guard from Hard rule 1: existing files are merged into or skipped, never replaced. An existing `.claude/settings.json` gets the `hooks.PreToolUse` entries merged in (hooks merge across levels; show the diff first).
2. Fill every slot; delete every `loops:init` comment.
3. Stamp `LOOPS_VERSION` in `docs/LOOP.md` from `version` in the plugin's `.claude-plugin/plugin.json`, then record the base the repo was installed from: `node scripts/loops-update.mjs init --plugin "${CLAUDE_PLUGIN_ROOT}"` writes `.loops/manifest.json` (version, kind and sha256 per managed/mixed file) and `.loops/base/`, and adds `.loops/update/` to `.gitignore`. Both are committed with the install: they are what makes a later `/loops:update` a three-way merge instead of a guess (ADR-0005). A managed file the repo decides to keep its own version of goes into `manifest.frozen`, with the reason in an ADR.
4. Write `docs/decisions/ADR-0001-*.md` (stack) plus one short ADR per confirmed boundary, using `docs/templates/decision.md`, status `Accepted` (or `Proposed` if the user hesitated), dated today. Fill `- **Enforced by:**` from the inventory of Step 1: the check that exists, or `none yet — prose only` (never invent one; `loops-check` notes those and `/loops:encode` is the follow-up). Fill the index table in `docs/decisions/README.md`.
5. Leave `docs/intents/`, `docs/specs/`, `docs/stories/` and `docs/reviews/` empty except their READMEs — real work fills them, starting with `/loops:intent`. Create `docs/decisions/OPEN.md` from the template (empty queue). Run `node scripts/loops-gen.mjs` once so the generated blocks exist in their rendered form.
6. If the repo has no `.gitattributes`, add `* text=auto eol=lf`.
7. **Wire `loops-check` to an invoker — it is not optional and the script now fails without one.** Prefer the repo's existing mechanism: a hook manager already in `package.json` (lefthook, husky, pre-commit) gets a pre-push entry; a CI config the remote actually reads gets a job. When the repo has neither, use the dependency-free path — write `.githooks/pre-push` running `node scripts/loops-check.mjs`, mark it executable, and tell the user to run `git config core.hooksPath .githooks` (a per-clone setting you cannot commit for them). Do not settle for adding a `package.json` script: an alias is a shorter way to type the command, not something that runs it.
8. Do **not** copy skills into the target (ADR-0003): they are used as `/loops:<name>` from the installed plugin. Tell the user the two install commands (`/plugin marketplace add <this repo's git url>` · `/plugin install loops@loops`) if the plugin is not installed yet. Copy `ci/github-loops.yml` or `ci/gitlab-ci.yml` to where the remote reads it only when the user confirms which CI the remote runs.

## Step 4 — Validate, then hand over

- Run `node scripts/loops-check.mjs` from the target repo root — it must print OK (covers leftover slots/comments, required files and convention text, AGENTS.md size budget, boundary↔ADR existence, TEST_MATRIX cell convention, story front matter + Ready/Done rules + `owns` overlap + generated-block freshness, the intent → spec chain, ADR status, that the hooks in `.claude/settings.json` exist, and that the check itself has an invoker). If it fails on the invoker, Step 3.7 was skipped — go back and wire it rather than reporting the repo as done. Then run one hook by hand so the user sees the layer exists: `echo '{"tool_name":"Bash","tool_input":{"command":"git add -A"}}' | node .claude/hooks/stage-guard.mjs; echo $?` → `2`.
- Every relative link in the generated files resolves (the script doesn't check links).
- The `<!-- LOOPS:BEGIN/END -->` markers in AGENTS.md and FEATURE_INTAKE.md survived generation intact — they delimit harness-owned blocks for future updates (see the plugin's `loops-install-files.txt` for the managed/mixed/seeded ownership map).
- Report to the user: files created, ADRs written, and the two follow-ups that are theirs — write the first product contract doc in `docs/product/`, and classify their next piece of work through `docs/FEATURE_INTAKE.md`.

Do not commit unless asked.
