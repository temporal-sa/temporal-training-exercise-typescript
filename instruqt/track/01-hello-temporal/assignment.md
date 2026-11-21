---
slug: hello-temporal
type: challenge
title: 'Exercise 1: Hello Temporal'
teaser: Write your first Workflow, Activity and Worker. Run it and read the event
  history.
notes:
- type: text
  contents: |-
    # What does a Workflow actually run on?

    You write a function. You never call it. Something else picks it up,
    runs it, and records every step.

    That something is a Worker, and it is polling a task queue right now
    waiting for code you have not written yet.
- type: text
  contents: |-
    # Already running in your sandbox

    A Temporal dev server on 127.0.0.1:7233, with the Web UI on port 8233.
    The AccountId and TransferStatus search attributes are already
    registered, so exercise 4 works when you get there.

    `npm install` has already run. The Solution tab has finished code for
    every exercise. Use it when you are stuck, not before.
tabs:
- title: Code Editor
  type: code
  hostname: workshop
  path: /root/workshop/exercise1
- title: Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop
- title: Terminal
  type: terminal
  hostname: workshop
  workdir: /root/workshop
- title: Temporal UI
  type: service
  hostname: workshop
  path: /
  port: 8233
- title: Solution
  type: code
  hostname: workshop
  path: /root/workshop/solution1
- title: Network Control Panel
  type: service
  hostname: workshop
  path: /
  port: 5000
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Hello Temporal

Three files. Three TODOs. A greeting that survives anything.

> [!NOTE]
> **Sandbox Notes:**
> - [button label="Code Editor" background="#444CE7"](tab-0) edits the files in `exercise1/`
> - [button label="Worker" background="#444CE7"](tab-1) runs the Worker
> - [button label="Terminal" background="#444CE7"](tab-2) starts Workflows
> - [button label="Temporal UI" background="#444CE7"](tab-3) is the Temporal Web UI
> - [button label="Solution" background="#444CE7"](tab-4) has the finished code
> - [button label="Network Control Panel" background="#444CE7"](tab-5) toggles outbound HTTP
>
> The blue buttons above are clickable. Click any to jump to that tab.
> Instruqt saves editor changes for you. There is no save step.

# The Code

Open the [button label="Code Editor" background="#444CE7"](tab-0). Everything
lives under `src/`:

| File | What goes in it |
|------|-----------------|
| `activities.ts` | `createGreeting` returns `` `Hello, ${name}!` `` |
| `workflow.ts` | `greet` calls `createGreeting` and returns its result |
| `worker/index.ts` | Uncomment `workflowsPath` so the Worker can find `greet` |
| `starter/index.ts` | Nothing. Read it: it starts `greet` on `hello-task-queue` |

The Activity is where side effects live. The Workflow only orchestrates,
through the `proxyActivities` stand-in already at the top of `workflow.ts`. The
Worker is the process that runs both.

> [!IMPORTANT]
> Delete each `// TODO` comment once you have done what it asks. The check
> looks for leftovers.

# Start the Worker

Click the [button label="Worker" background="#444CE7"](tab-1) terminal:

```bash,run
npx ts-node exercise1/src/worker/index.ts
```

Wait for the `Worker state changed` line that ends in `state: 'RUNNING'`. It
stays in the foreground and polls. Leave it running.

# Run It

Click the [button label="Terminal" background="#444CE7"](tab-2):

```bash,run
npx ts-node exercise1/src/starter/index.ts
```

```bash,nocopy
Hello, Temporal!
```

If you changed code after starting the Worker, stop it with `Ctrl+C` and
start it again. The Worker bundles your Workflow code once, at startup.

# Read the History

Click the [button label="Temporal UI" background="#444CE7"](tab-3). Click your
`greeting-workflow-...` execution at the top of the list. Hit refresh if it is
not there yet.

Open the **Event History**. Look for `ActivityTaskScheduled`,
`ActivityTaskStarted` and `ActivityTaskCompleted`. Those three events are the
whole point. Temporal wrote down that the Activity ran and what it returned.
Replay reads that back instead of calling the Activity again.

Click **Check** when the greeting prints.

# Key Takeaways

- A Workflow is an exported async function. The Worker finds it through
  `workflowsPath` and bundles it into a deterministic sandbox.
- Workflows call Activities through `proxyActivities`, never directly.
- A Worker only runs what you register with it, on the task queue you name.
- Every Activity result lands in the event history, which is what makes replay work.
