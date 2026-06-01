# GitHub Copilot instructions

This repository is a **Temporal** training course (TypeScript) plus a Vue course
site and a Daytona-backed live runner. When generating code or **reviewing pull
requests**, apply the Temporal best practices below.

These instructions distill three vendored skills under
[`.agents/skills/`](../.agents/skills/). Copilot's coding agent and CLI can load
the full skills directly; the PR review bot uses this file. Consult the skill's
`SKILL.md` and `references/` for depth:

- [`temporal-developer`](../.agents/skills/temporal-developer/SKILL.md) — building & debugging Workflows, Activities, Workers across SDKs.
- [`temporal-cloud`](../.agents/skills/temporal-cloud/SKILL.md) — Cloud connection, auth, TLS/x509, namespace, PrivateLink issues.
- [`temporal-workflow-design-critic`](../.agents/skills/temporal-workflow-design-critic/SKILL.md) — structured design/architecture critique.

## How to review a PR that touches Temporal code

Flag findings by severity (high / medium / low) with a concrete fix. Prioritize:

### Workflow determinism (highest priority)
Workflow code is replayed from event history, so it **must be deterministic**.
In a Workflow function, flag:
- `Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID()`, or any
  wall-clock / random source — use Workflow-safe APIs (`workflowInfo()`,
  injected/seeded values, `uuid4` from `@temporalio/workflow` where applicable).
- Direct I/O, network calls, DB access, env/filesystem reads — these belong in
  **Activities**, not Workflows.
- Reading mutable global/module state, or spawning unmanaged timers/promises.
- Iterating over non-deterministically ordered collections (e.g. `Set`/`Map`
  insertion-order assumptions, `Object.keys` over external data).
- Use `sleep()` from `@temporalio/workflow`, never `setTimeout`.

### Versioning & replay safety
- Changing the logic of an already-deployed Workflow without `patched()` /
  `deprecatePatch()` (TS) can break replay of in-flight executions. Any change to
  Workflow control flow should be guarded or shipped via a new Task Queue / Worker
  Build ID. See exercise 8 for the `patched()` pattern this course teaches.
- Renaming Workflow/Activity/signal/query/update handlers, or reordering/removing
  Activity calls, is a breaking change for running Workflows.

### Activities, retries & timeouts
- Every Activity needs a sensible `startToCloseTimeout` (or `scheduleToClose`).
  Flag missing or unbounded timeouts.
- Long-running Activities must **heartbeat** and check for cancellation.
- Use `ApplicationFailure.nonRetryable(...)` for errors that will never succeed
  (e.g. invalid input) instead of relying on infinite default retries — see
  exercise 7.
- Don't swallow Activity errors silently; let the Workflow compensate (saga) or
  surface them.

### Payloads, event history & signals
- Keep Workflow/Activity arguments and return values small and serializable.
  Large payloads bloat event history; prefer passing references (IDs/keys).
- Watch for unbounded event history growth (long loops, high signal volume) —
  use **Continue-As-New** to reset history.
- `condition()` waits should have a timeout where a stuck waiter is possible.

### Workers, task queues & config
- Worker `taskQueue` must match the queue the client starts the Workflow on
  (a frequent silent "stuck workflow" bug — see exercise 1).
- Register the correct `workflowsPath` and `activities` on the Worker.
- Don't hardcode Cloud connection details, namespaces, or certs in source; use
  env/config. For Cloud TLS/x509/namespace/endpoint problems, follow
  `temporal-cloud`.

### Testing
- Prefer `@temporalio/testing` with time-skipping; mock Activities in Workflow
  unit tests (exercise 6). New Workflow logic should come with replay/unit tests.

## Repo conventions
- Exercises live in `exerciseN/src`; reference answers in `solutionN/`. Keep an
  exercise's starter code intentionally incomplete — don't "fix" it to match the
  solution unless that's the explicit task.
- Match surrounding style; this is teaching code, so favor clarity over cleverness.
