# ADR-0003 — Skills are installed only as a plugin and named by the stage verb

- **Status:** Accepted
- **Date:** 2026-10-06
- **Supersedes / Superseded by:** —
- **Enforced by:** none yet — prose only (`/loops:init` Step 3.8 does not copy skills; `evals/run.sh` exercises the plugin path through `--plugin-dir`, which is a positive proof of the install path, not a check that no copy exists)
- **Context:** The predecessor harness prefixed every skill `h-` because `/loops:init` could also copy skills into a consuming repo's `.claude/skills/`, where bare names (`review`, `start`) collide with personal or project skills (`retrospective`, `brainstorming` exist on the author's machine). The plugin namespace already prevents the collision: a plugin skill is invoked as `/<plugin>:<skill>`.

## Decision

Skills are used only through the plugin: `/loops:intent`, `/loops:spec`, `/loops:next`, `/loops:wave`, `/loops:start`, `/loops:land`, `/loops:review`, `/loops:init`, `/loops:update`, `/loops:improve`, `/loops:sync`. `/loops:init` does not copy skills into the target repo, and `loops-install-files.txt` has no `.claude/skills/` entry. Skill `name` fields are the bare verb; descriptions carry Vietnamese trigger phrases so Vietnamese prompts still match.

## Options rejected

- **Keep the `h-` prefix:** redundant under a namespace, and it reads as a different product.
- **Copy with a `loops-` prefix on copy:** two install paths to keep working; the copy path was only there for people without plugin support, who are not a known user.

## Consequences

- ✅ Short names, one install path, `/loops:update` has fewer managed files.
- ⚠️ `/loops` autocompletes next to Claude Code's built-in `/loop` command; the namespace keeps them apart but both appear in the picker.

## Related

ADR-0001 · ST-001
