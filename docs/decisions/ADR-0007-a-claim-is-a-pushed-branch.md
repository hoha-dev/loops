# ADR-0007 — Across developers, a claim is a pushed branch and an id is allocated after a fetch

- **Status:** Accepted
- **Date:** 2026-10-06
- **Supersedes / Superseded by:** —
- **Settles before:** SPEC-002, ST-011
- **Enforced by:** `loops-gen --claims --fetch` and `--next-id` · `loops-check` item 15 (duplicate ids fail; stale fetch is a note) · `owns-guard` (new files only under `docs/decisions/`, `docs/intents/`, `docs/specs/`) · `test/run.mjs` T-PAR-1…3 · `test/hooks.mjs` T-HOOK-7
- **Context:** v0.1 was built for one developer with several sessions: claims are `story/ST-xxx` branches, which every worktree of one clone sees without network (L33). A second developer has their own clone. What that clone sees is `refs/remotes/origin/*` as of the last fetch: a branch that was never pushed, or a fetch that never happened, and two developers are handed the same story by `/loops:wave`, allocate the same `OPEN-004` or `INT-003` from their local folders, and edit each other's Proposed ADR (self-review F3). None of this fails before the merge, and at the merge it fails as a text conflict with no message.

## Decision

1. **A claim exists when the branch is on the remote.** `/loops:start` pushes `story/ST-xxx` right after creating it (`git push -u origin`), before any work; without a remote the local branch is the claim, as in v0.1. `/loops:wave`, `/loops:next` and `/loops:start` run `node scripts/loops-gen.mjs --claims --fetch`, which does `git fetch --prune origin` first. `loops-check` never fetches (it runs offline and in hooks); it notes when `.git/FETCH_HEAD` is older than one day, so a stale view is named rather than trusted.
2. **Ids are allocated by `loops-gen --next-id ST|OPEN|INT|SPEC|ADR`**, which scans main and every local and remote branch for the highest number of that kind; the skills use it instead of "next free id from the folder". Two developers who both allocate before either pushes can still collide, so `loops-check` fails on a duplicate id (two files with one id, or one id twice in `OPEN.md`): the second one to merge renumbers.
3. **`owns-guard` narrows the always-allowed set.** Under `docs/decisions/`, `docs/intents/` and `docs/specs/` a story may edit `OPEN.md` and create new files; an existing file there belongs to the story or spec that wrote it. Its own packet, the generated tables and `docs/reviews/` stay allowed.
4. **Merge order is documented, not automated.** The second story to merge conflicts in the two generated tables; the rule from L34 (resolve story files, run `loops-gen`) holds across developers unchanged.

## Rejected options

- **A lock file or a claims table in the repo:** a file every start edits is the L21 shared file again; the branch ref is already a per-story object git merges for free.
- **A server-side id service:** nothing to run it on; the merge-time check plus fetch-first keeps collisions rare and visible.
- **Fetching inside `loops-check`:** a push hook that needs the network, and a side effect in a check.
- **An `assignee:` field in the story front matter:** the branch's author is the assignee, and a field would drift from the branch.

## Consequences

- ✅ Two clones that fetch see the same occupied set; a stale clone is told so.
- ✅ A duplicated id is a red check with the two files named, not a silent overwrite in a Map.
- ⚠️ `/loops:start` now needs push rights before the first edit; a developer without them works as in v0.1 and tells the team by other means.

## Related

INT-002 row 9 · SPEC-002 · ST-011 · L21, L33, L34 · self-review 2026-10-06 F3
