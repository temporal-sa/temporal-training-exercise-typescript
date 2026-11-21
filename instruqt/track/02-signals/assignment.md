---
slug: signals
id: mavrxqldvudu
type: challenge
title: 'Exercise 2: Money Transfer with Signals'
teaser: A transfer that stops and waits for a human to approve it, then deposits or
  refunds.
notes:
- type: text
  contents: |-
    # A Workflow is waiting on a human. Who pays for the wait?

    The money left the source account. Now a person has to approve the
    deposit. That person is at lunch.

    No polling loop. No cron job. No row in a "pending approvals" table.
    The Workflow just waits, and the wait costs you nothing.
- type: text
  contents: |-
    # Did you know?

    A Workflow blocked on `condition()` holds no Worker slot. Temporal can
    evict it from the Worker's cache entirely and rebuild it when the
    Signal arrives. A wait of ten seconds and a wait of ten months cost
    the same.
tabs:
- id: zhywthajwhec
  title: Code Editor
  type: code
  hostname: workshop
  path: /root/workshop/exercise2
- id: jjaxeawzzvou
  title: Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop
- id: nmak5a2e6vfi
  title: Terminal
  type: terminal
  hostname: workshop
  workdir: /root/workshop
- id: q9xgsh2vqjl6
  title: Temporal UI
  type: service
  hostname: workshop
  path: /
  port: 8233
- id: hvel8xgxnvt2
  title: Solution
  type: code
  hostname: workshop
  path: /root/workshop/solution2
- id: 2nx2h8ad8yjq
  title: Network Control Panel
  type: service
  hostname: workshop
  path: /
  port: 5000
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Money Transfer with Signals

Withdraw. Wait for a human. Deposit if they said yes, refund if they said no.

# The Code

Open the [button label="Code Editor" background="#444CE7"](tab-0). Four files
under `src/` carry TODOs. `models.ts` is already done.

### `activities.ts`

`withdraw` and `deposit` log and then fail some of the time:

```typescript
if (Math.random() < 0.1) throw new Error('withdrawal failed - insufficient funds');
```

Use `0.1` for `withdraw` and `0.05` for `deposit`. The random failure is
deliberate: it is what makes Temporal's automatic Activity retries visible in
the next step.

### `workflow.ts`

`approveSignal` is already defined. Inside `transfer`:

- Register a handler with `setHandler(approveSignal, ...)` that records the
  decision and that a decision arrived.
- Call `withdraw`.
- `await condition(() => approvalReceived)`.
- Call `deposit` on approval, `refund` on rejection, and return
  `'Transfer completed successfully'` or `'Transfer rejected and refunded'`.

### `worker/index.ts` and `starter/index.ts`

Uncomment `workflowsPath` in the Worker. Uncomment the delay and the
`handle.signal(approveSignal, true)` call in the starter.

> [!IMPORTANT]
> Delete each `// TODO` comment once you have done what it asks. The check
> looks for leftovers.

# Start the Worker

Click the [button label="Worker" background="#444CE7"](tab-1):

```bash,run
npx ts-node exercise2/src/worker/index.ts
```

# Run It

Click the [button label="Terminal" background="#444CE7"](tab-2):

```bash,run
npx ts-node exercise2/src/starter/index.ts
```

The starter waits two seconds, then sends the approval. Watch the Worker tab.
If an Activity hit its simulated failure you will see the error, then the
same Activity running again. You did not write that retry.

# Signal It Yourself

The Signal does not have to come from the starter. In `starter/index.ts`,
comment out the `handle.signal(approveSignal, true)` line and run the starter
again. It prints nothing and waits.

From a second shell in the [button label="Worker" background="#444CE7"](tab-1)
tab, or the Temporal UI's **Send a Signal** button, approve it:

```bash
WORKFLOW_ID=$(temporal workflow list --query 'ExecutionStatus="Running"' --limit 1 -o json | jq -r '.[0].execution.workflowId')

temporal workflow signal \
  --workflow-id "$WORKFLOW_ID" \
  --name approve \
  --input true
```

The starter prints the result the moment the Signal lands. Put the line back
when you are done.

# Look at the Wait

Click the [button label="Temporal UI" background="#444CE7"](tab-3). Open your
Workflow, then the **Event History**. Find `WorkflowExecutionSignaled`. Above
it, the Workflow was doing nothing at all, and it was not consuming a Worker
while it did.

Click **Check** when the transfer completes.

# Key Takeaways

- `defineSignal` names a Signal; `setHandler` decides what it does to Workflow state.
- `condition()` blocks on that state without burning a Worker.
- Failed Activities retry on their own. The default retry policy is already on.
- The Signal is recorded in history, so replay makes the same decision.
