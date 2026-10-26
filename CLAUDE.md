# CLAUDE.md — loops

Claude Code does not auto-load AGENTS.md, so import it explicitly into every session:

@AGENTS.md
@docs/FEATURE_INTAKE.md

Read AGENTS.md before editing anything. Respect the "Invariant boundaries" — each is backed by an ADR in docs/decisions/.

## Language rules (invariant)

- **Chat with the user:** reply in the language of the input.
- **Source code is always English:** variable/function/type names, comments, commit messages, logs, docstrings. (Business docs in `docs/` are written in English.)

## Local notes (humans + agents append over time)

