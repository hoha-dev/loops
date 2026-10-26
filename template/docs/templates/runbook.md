# Runbook: [app/service] — verified operations

> Iron rule: record only content **verified by actually running it**. A heading with no verified content
> is a GAP — put it under Unknowns, don't invent. Agents operate the app by this file; not in here =
> never invent commands, credentials, ports, or cleanup obligations.

## Environment requirements

[Runtime, env vars (point at `.env.example`), dependent services, ports used.]

## Start (verified)

```bash
[the exact start command you actually ran]
```

[How long it takes; which log line signals readiness.]

## Liveness check (smoke)

[1-3 commands/URLs confirming the app works — with expected output.]

## Stop & cleanup (ownership)

- Run **isolated instances** only; stop/delete only resources **this run** created.
- [Stop command; which resources get spawned (containers, temp files, background processes) and how to clean them.]

## Unknowns

[What has NOT been verified — so the next person knows this file's limits.]
