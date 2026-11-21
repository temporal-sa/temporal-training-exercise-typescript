---
slug: queries
id: q3gesmp1bsdz
type: challenge
title: 'Exercise 3: Money Transfer with Queries'
teaser: Ask a running Workflow what it is doing right now, without touching a database.
notes:
- type: text
  contents: |-
    # Where do you look to find out what a Workflow is doing?

    Not a status table. Not a log aggregator. Not a metrics dashboard.

    The Workflow itself holds the state, in ordinary local variables. A
    Query reads those variables out of a running execution.
- type: text
  contents: |-
    # Signals in, Queries out

    A Signal changes Workflow state and gets written to history. A Query
    reads state and is never written to history at all.

    That is why a Query handler must not mutate anything and must not
    call an Activity. Break that rule and replay stops matching.
tabs:
- id: p4fxuh9o0374
  title: Code Editor
  type: code
  hostname: workshop
  path: /root/workshop/exercise3
- id: xwegawbxufle
  title: Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop
- id: 6tbhguvxfoon
  title: Terminal
  type: terminal
  hostname: workshop
  workdir: /root/workshop
- id: nzn1gebowztv
  title: Temporal UI
  type: service
  hostname: workshop
  path: /
  port: 8233
- id: ho8r5olpledh
  title: Solution
  type: code
  hostname: workshop
  path: /root/workshop/solution3
- id: 9hadw4zm0mit
  title: Network Control Panel
  type: service
  hostname: workshop
  path: /
  port: 5000
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Money Transfer with Queries

Same transfer as exercise 2. This time it can answer questions while it runs.

# The Code

Open the [button label="Code Editor" background="#444CE7"](tab-0). Every TODO
is in `src/workflow.ts`. `getStatusQuery` is already defined, and `status`
already starts at `'PENDING'`.

- Register the handler: `setHandler(getStatusQuery, () => status)`.
- Wrap `withdraw` and `deposit` in `try`/`catch`: set `status = 'FAILED'` and
  rethrow.
- Set `status = 'APPROVED'` before the deposit, `'COMPLETED'` after it.
- Set `status = 'CANCELLED'` after the refund.

> [!WARNING]
> A Query handler runs during replay. Do not mutate state in one, do not
> call an Activity from one, and do not sleep in one. Read a variable and
> return it.

The starter is already done. It Queries the status one second in, before it
sends the approval.

> [!IMPORTANT]
> Delete each `// TODO` comment once you have done what it asks. The check
> looks for leftovers.

# Start the Worker

Click the [button label="Worker" background="#444CE7"](tab-1):

```bash,run
npx ts-node exercise3/src/worker/index.ts
```

# Run It

Click the [button label="Terminal" background="#444CE7"](tab-2):

```bash,run
npx ts-node exercise3/src/starter/index.ts
```

```bash,nocopy
Status: PENDING
Transfer completed successfully
```

# Query From Outside

The starter is not special. Ask the most recent transfer yourself, from the
[button label="Terminal" background="#444CE7"](tab-2):

```bash,run
WORKFLOW_ID=$(temporal workflow list --query 'TaskQueue="money-transfer-task-queue"' --limit 1 -o json | jq -r '.[0].execution.workflowId')
echo "$WORKFLOW_ID"
temporal workflow query --workflow-id "$WORKFLOW_ID" --name getStatus
```

That one finished, so it answers `COMPLETED`. To catch one mid-flight, comment
out the `handle.signal(approveSignal, true)` line in the starter, run it again,
and query the new Workflow while it waits. Then approve it:

```bash
temporal workflow signal --workflow-id "$WORKFLOW_ID" --name approve --input true
```

> [!NOTE]
> A Query is answered by a Worker, not by the server. Stop the Worker in the
> [button label="Worker" background="#444CE7"](tab-1) tab and the same command
> fails. Start it again and it answers, with the state rebuilt by replay.

Click **Check** when the transfer completes.

# Key Takeaways

- `defineQuery` plus `setHandler` exposes Workflow state to any client. Read-only.
- Query results never enter the event history, which is why mutation is banned.
- The state lives in plain local variables. Temporal rebuilds them by replay.
- Signals write, Queries read. Reach for a Signal when you need to change something.
