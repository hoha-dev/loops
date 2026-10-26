---
name: next
description: Triage what to work on next in a harness-managed repo — reconcile the story backlog's claimed status against the actual code, then recommend one next task with its FEATURE_INTAKE class and blockers. Use this skill whenever the user asks what to do next, what is left, where the project stands, what is blocking, what to pick up this sprint, or types "làm gì tiếp theo", "còn gì phải làm", "dự án đến đâu rồi", "next?". Use it at the start of a session when the user gives no concrete task. Do NOT use it when the user already knows what to build and wants to explore how (that is /loops:intent), or when they want a milestone lookback (that is /loops:review).
---

# Next-step triage

Output a **decision**, not a status report: one recommended next task, its FEATURE_INTAKE class, and what blocks it. The user can read the backlog table faster than you can summarize it — your value is the reconciliation in Step 2.

Requires the repo to carry the harness layout (`AGENTS.md`, `docs/stories/`, `docs/TEST_MATRIX.md`...). If it doesn't, say so and offer `/loops:init` instead.

**This skill picks ONE task.** When the user wants several sessions at once, hand off to `/loops:wave` — it computes the parallel-safe set from story front matter instead of guessing.

---

## Step 1 — Read the board

| Source                     | What to take from it                                                        |
| -------------------------- | --------------------------------------------------------------------------- |
| `node scripts/loops-gen.mjs --claims --fetch && node scripts/loops-gen.mjs && node scripts/loops-check.mjs` | Run first. The fetch brings other developers' story branches (ADR-0007); the backlog is generated from story front matter; a red check means the board lies somewhere — that finding outranks any recommendation. A story listed by `--claims` is taken, whatever its status column says here |
| `docs/stories/README.md`   | The generated backlog: ID, class, status, depends_on, **Blocked by** (unmet deps, open OPENs, missing `consumes`) |
| `docs/stories/ST-*.md`     | For any open story: the front matter (`status`, `owns`, `opens`) and Scope. Legacy packets without front matter: read the Status line |
| `docs/decisions/OPEN.md`   | Open rows = decisions the human owes; a story blocked only by these is a PO task, not an agent task |
| `docs/intents/`, `docs/specs/` | A story whose `trace` names a draft spec, or work with no intent yet: the next step is `/loops:spec` or `/loops:intent`, not code |
| `docs/TEST_MATRIX.md`      | Proof rows per behavior, status ✅/🟡/☐ — the real definition of done       |
| `docs/reviews/*.md`        | The latest review's priority-ordered actions — items gated "before X"       |
| `docs/decisions/README.md` | The drift notes under the index — scope narrowed after the ADR was written  |
| `git log --oneline -15`    | What actually got worked on recently — see Step 2                           |

Read these directly. Do not delegate to a subagent — it is a handful of files, and the reconciliation needs the contents in your own context.

Backlog legend: the status column is a bare emoji (harness rule "one source of status"); the story file's Status line is authoritative. When the two disagree, the story file wins — and the disagreement itself is worth reporting.

---

## Step 2 — Reconcile claimed status against the code (the point of this skill)

A story marked ✅ in the backlog means someone finished _something_. It does not mean the module runs. Repos that scaffold up front make "the file exists" and "the file does anything" look identical from the table.

Find the stubs with the Grep tool (not shell `grep` — some repos forbid bash-only steps; the tool works everywhere):

- pattern: `NOT_IMPLEMENTED|TODO ST-|FIXME|continue-on-error` — plus any stub marker this repo's AGENTS.md declares
- glob: the source trees the backlog stories own (e.g. `apps/**`, `packages/**`, `src/**`, CI config)

Treat a story as **actually done** only when all four hold:

1. Its code has no stub marker in the entrypoint it owns.
2. Its `TEST_MATRIX.md` rows are ✅ — not ☐, not 🟡.
3. Nothing it exports is still a bare empty module. **Exception:** generated artifacts are placeholders by design until codegen runs — that is evidence of an upstream blocker, not a defect in itself.
4. **Its new exports have a consumer edge.** The stub grep cannot catch this class: the artifact is complete, its own tests are green, the docs describe it in future tense — and no one imports it, so it has never run (contract-test frameworks nobody boots, mock handlers nobody registers, guard rails nobody wires — see the harness LESSONS.md, L15). For each "gate"/"harness"/"mock"/"recompute" module a story delivers, grep the consuming tree for the export name AND check the consumer's manifest (`package.json` or equivalent) actually declares the dependency. Run `node scripts/loops-check.mjs` if the repo has it. No call site = not done, regardless of green tests — the missing thing is an edge in the import graph, not content in a file.

Also check CI gates that exist but do not bite (L16): a job with `continue-on-error: true` is not a gate, a workflow file the remote's CI system never reads (e.g. GitHub Actions YAML on a GitLab remote) is not a gate, a check script no hook or job invokes is not a gate, and a test suite outside the default `test` target that only runs when someone remembers to type it is not a gate.

When claimed and actual disagree, **say so explicitly and name the file:line**. That gap is usually the real answer to "what's next" — it silently blocks every story downstream of it.

**Then read `git log` to see whether this was already raised.** If recent commits route _around_ the gap you just found, a prior session likely recommended it and the user chose otherwise. Say so, and ask whether they want it now or want it recorded as a deliberate deferral — do not silently re-recommend the same thing every session.

> **Shape of a good finding (illustration):** the backlog says the scaffold story is ✅, but the three app entrypoints are stubs; no server bootstrap means no generated API client, so every UI story downstream is blocked. The correct recommendation was a runtime-skeleton story that did not exist in the backlog yet — not the next unchecked row. Derive your own finding from the code you just read; proposing a story the backlog does not contain is a valid outcome (say it is new, number it as the next free `ST-NNN`).

---

## Step 3 — Check for decisions due before more code

Cheap now, expensive later. Scan for open items in these classes and flag any that the recommended task would touch:

- Latest review's action list: items tagged "before deep coding" / "before public" that no doc changelog has since closed.
- Invariant boundaries in `AGENTS.md` the task would brush against — a task that violates one **stops and asks the human** (FEATURE_INTAKE 🔴 rule).
- Drift notes in `docs/decisions/README.md` — so the recommendation does not implement dead scope.

---

## Step 4 — Pick one and classify

Order candidates by: **unblocks the most downstream work** > **highest technical risk** > **backlog order**. Risky-and-core beats cheap-and-peripheral — surfacing a core-domain problem early is the whole reason a backlog front-loads 🔴 work.

Classify the pick with the `docs/FEATURE_INTAKE.md` decision tree (🟢 do it now / 🟡 story packet + TEST_MATRIX / 🔴 story packet + ADR + human review).

**If the user gives a time box**, split the recommendation into a must-land core and a droppable second half, and name which half to cut if it slips. State plainly that the sizing is judgement: without velocity history any estimate is a guess — do not dress it up as a plan.

---

## Output shape

Adapt it to the question asked; the slots below are the default, not a form to fill.

```
**Done (verified):** <story IDs>
**Claimed ✅ but not running:** <ID> — <file:line> <what is missing>   ← omit if none

## Recommended next: <task> (🟡/🔴)
<2-3 sentences: what it unblocks, why now>

**Blocked by:** <blockers, or "nothing">
**Decisions to settle first:** <review/ADR items, or "none">
**Cheap fixes alongside:** <1-3 one-line doc fixes, optional>

<one question: start with the story packet, or code directly?>
```

Keep it tight — around 25 lines. Two justified reasons to go longer: the user asked something the slots do not cover (e.g. "which ones are a waste of effort" is answered by an explicit **do-not-pick** list as much as by the pick), or a time box needs the Step 4 split. Never pad with status tables the user can read themselves.

Reply in the user's language.

End by asking which entry point they want. Do not start implementing — this skill triages; the user picks.

---

## Scale

Steps 1–2 always run. If the reconciliation finds no drift and the next backlog row is unambiguous, skip Steps 3–4's ceremony and answer in five lines. Save the full shape for when claimed and actual status disagree.
