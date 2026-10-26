# Improvement — `loops-update apply` and `--continue` write the LOOPS_VERSION stamp in docs/LOOP.md

> Date: 2026-10-15 · Owner: Trung Nguyen · Scope: template/scripts/loops-update.mjs (`stampVersion`, `cmdApply`, `cmdContinue`), skills/update/SKILL.md Step 3, test/update.mjs
> Snapshot: written once by `/loops:improve`, never edited afterwards. Lives in `docs/reviews/YYYY-MM-DD-improve-<slug>.md`.

## 1. Representative job

2026-10-15, releasing loops 0.2.1 (worktree location): `node scripts/loops-update.mjs apply --plugin .` on the loops repo, then `node scripts/loops-update.mjs apply --plugin <loops>` on project C, both run directly from the shell, as the commit message of ST-012 and the request for project C described.

## 2. Baseline (what happened without the change)

- loops repo: `loops-update: applied 0 file(s); now at 0.2.1`, then `test/release.mjs`: `✗ docs/LOOP.md LOOPS_VERSION is 0.2.0, plugin.json says 0.2.1`.
- project C: `applied 2 file(s); now at 0.2.1`, then `loops-check: note — LOOPS_VERSION 0.2.0 in docs/LOOP.md but .loops/manifest.json says 0.2.1 — one of them was edited by hand`.
- Both stamps were fixed by hand. The note blames a hand edit; the real cause is that nothing writes the stamp.

## 3. Earliest gap

| Kind | Capability (the script that knows the version does not write it; a prose step in a skill does) |
| --- | --- |
| Where | skills/update/SKILL.md Step 3.1 ("set it to the plugin version by hand") and template/scripts/loops-update.mjs `cmdApply` / `cmdContinue`, which write the manifest version but not the stamp |
| Why this is the earliest | The version is known at the moment `commitPlan` writes the manifest; any later step is a second place that can be skipped — and was skipped twice when the script was run without the skill. |

## 4. Correct owner of the fix

The script (`loops-update.mjs`): a deterministic step belongs in code, not in a skill sentence (ADR-0004). Step 3.1 of the skill becomes "check the stamp the script wrote".

## 5. Hypothesis

**If** `cmdApply` and `cmdContinue` replace `(loops vX.Y.Z)` in `docs/LOOP.md` with the plugin version after `commitPlan` **at** template/scripts/loops-update.mjs **then** an update run directly from the shell leaves `loops-check` and `test/release.mjs` with no version mismatch **because** the stamp is written in the same run as the manifest version it must equal.

- **Evidence that would weaken this:** a consumer whose `docs/LOOP.md` has no `(loops vX.Y.Z)` line (custom header) still gets the mismatch note — then the stamp should move into a managed block instead.
- **Maintenance owner and removal condition:** Trung Nguyen. Remove `stampVersion` if the stamp moves inside a LOOPS block (then the three-way merge carries it) or the `LOOPS_VERSION` stamp is dropped in favour of the manifest alone.

## 6. Fresh rerun

| What ran | Fresh session? | Hit the changed path? | Result | Cost |
| --- | --- | --- | --- | --- |
| `node test/update.mjs` T-UPD-7 | no (fixture) | yes: apply 0.1.0 → 0.2.0 on a stamped repo | ok | 0 |
| `loops-update apply --plugin .` on the loops repo (0.2.1 → 0.2.2, then → 0.2.3) | yes (real repo, run from the shell as before) | yes | `stamped docs/LOOP.md — loops v0.2.2`, then `v0.2.3`; `release: OK` both times | 0 |
| `loops-update apply --plugin <loops>` on project C (0.2.1 → 0.2.2) | yes (real consumer repo) | yes | **failed**: `conflict scripts/loops-update.mjs — 0 conflicting region(s)`. Cause: the new comment carried a literal slot, which `newSlots()` treats as text to fill. Aborted; fixed in 0.2.3 with T-UPD-8 (fails on the 0.2.2 file) | 0 |
| same on project C (0.2.1 → 0.2.3), run twice | yes | yes | 1st run: `update scripts/loops-update.mjs`, stamp still `v0.2.1` (the process was project C's old updater, which has no `stampVersion`). 2nd run, after committing: `stamped docs/LOOP.md — loops v0.2.3`; `loops-check` no longer notes a mismatch | 0 |

## 7. Verdict

**Keep** — from the second run on, an update run from the shell writes the stamp itself (seen on the loops repo and project C). Known limit: the first update to a version that changes the updater runs the old copy, so that one update needs a second `apply` after its commit; the 0.2.2 → project C attempt also showed a managed script must never contain a literal slot (T-UPD-8 now holds that).
