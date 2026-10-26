# docs/stories — Story Packets & Backlog

> Normal/High-risk work is split into story packets before coding (FEATURE_INTAKE). Each packet traces back to a requirement code in the product contract.

## Conventions

- **Stable IDs:** `ST-xxx` assigned sequentially, never reused. Merging/splitting stories mid-flight is normal — old IDs stay, the story body points to where the work landed.
- **One source of status:** status lives in the story file's front matter (`status:`). The table below is a **generated artifact** of `node scripts/loops-gen.mjs` — never edit or re-sort it by hand; edit the story and re-run. `loops-check` fails when the table disagrees with the stories.
- **Ready is a machine-checkable state**, not a feeling: every `depends_on` is done · `opens` is empty · every `consumes` exists on main · `owns` does not overlap an active story (`in-progress`, or with an unmerged `story/ST-xxx` branch). The "Blocked by" column lists exactly what is missing.
- **Parallel work:** only Ready stories with disjoint `owns` run at the same time (`/loops:wave` lists that set). Each session takes exactly one story in its own worktree and stages only paths inside its `owns` plus its own story file. Story branches are named starting with `story/ST-xxx`: `loops-check` reads the branches to know which stories someone is working on.
- **Across developers:** a claim is the `story/ST-xxx` branch **on the remote** — `/loops:start` pushes it before any work, and `/loops:wave` fetches before it computes (`loops-gen --claims --fetch`). Ids come from `loops-gen --next-id ST` (it counts every branch); a duplicate that still gets through two clones fails `loops-check` after the merge, and the one merged last renumbers.
- **Conflicts in the table below after a merge:** never fix them by hand. Resolve the story files first, then run `node scripts/loops-gen.mjs`.

## Backlog

<!-- LOOPS:GEN backlog -->
| ID | Story | Trace | Class | Status | Depends on | Blocked by |
| --- | --- | --- | --- | --- | --- | --- |
<!-- LOOPS:GEN-END backlog -->

## Template

[`../templates/story.md`](../templates/story.md) — the front matter is mandatory.
