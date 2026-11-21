---
slug: manual-retry
type: challenge
title: 'Exercise 7: Manual Activity Retry'
teaser: An Activity fails on bad data. Automatic retry cannot help. Fix the data with
  a Signal and let it continue.
notes:
- type: text
  contents: |-
    # The account number is wrong. How many times should Temporal retry?

    Automatic retry is the right answer when the failure is transient.
    A network blip, a rate limit, a restarted database.

    A typo in an account number is not transient. Retrying it a hundred
    times gets you the same error a hundred times.
- type: text
  contents: |-
    # Did you know?

    `ApplicationFailure.nonRetryable()` tells Temporal to stop retrying
    immediately and surface the failure to the Workflow.

    The Workflow can then park, wait for a human to send corrected data,
    and run the Activity again. Everything that already succeeded stays
    succeeded.
tabs:
- title: Code Editor
  type: code
  hostname: workshop
  path: /root/workshop/exercise7
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
  path: /root/workshop/solution7
- title: Network Control Panel
  type: service
  hostname: workshop
  path: /
  port: 5000
- title: Signals
  type: terminal
  hostname: workshop
  workdir: /root/workshop
difficulty: intermediate
timelimit: 1800
enhanced_loading: null
---

# Manual Activity Retry

The transfer starts from an account that does not exist. Instead of failing, it
parks and waits for someone to fix the account.

> [!IMPORTANT]
> This exercise has a seventh tab. Use
> [button label="Signals" background="#444CE7"](tab-6) to send Signals while
> the starter is still waiting in the
> [button label="Terminal" background="#444CE7"](tab-2).

# The Code

Open the [button label="Code Editor" background="#444CE7"](tab-0). Eight TODOs
across two files under `src/`.

### `activities.ts`

Two TODOs. Swap each `throw new Error(...)` for a non-retryable failure:

```typescript
if (account === 'invalid-account') {
  throw ApplicationFailure.nonRetryable('withdrawal failed - invalid account');
}
```

`nonRetryable` is the whole trick. A plain `Error` is retried forever, and the
Workflow never gets a chance to intervene.

### `workflow.ts`

Six TODOs. `retrySignal`, `retryRequested` and `updatedRequest` already exist.

1. `setHandler(retrySignal, ...)`: the Signal carries a `RetryUpdate` with a
   `key` (`fromAccount`, `toAccount` or `amount`) and a `value`. Write the value
   onto `updatedRequest` and set `retryRequested = true`. `amount` arrives as a
   string, so `parseFloat` it.
2. `updateStatus(newStatus)`: set `status` and
   `upsertSearchAttributes({ TransferStatus: [newStatus] })`.
3. `retryActivity(fn)`: loop forever. Return `await fn()` if it succeeds. If it
   throws, `updateStatus('PENDING_FIX')`, reset `retryRequested`, and
   `await condition(() => retryRequested)` before going round again.
4. Wrap `withdraw` and `deposit` in it. Pass a closure, so each attempt reads
   the latest `updatedRequest`:

```typescript
await retryActivity(() => withdraw(updatedRequest.fromAccount, updatedRequest.amount));
```

> [!IMPORTANT]
> Delete each `// TODO` comment once you have done what it asks. The check
> looks for leftovers.

# Run It

Click the [button label="Worker" background="#444CE7"](tab-1):

```bash,run
npx ts-node exercise7/src/worker/index.ts
```

Click the [button label="Terminal" background="#444CE7"](tab-2):

```bash,run
npx ts-node exercise7/src/starter/index.ts
```

The starter starts from `invalid-account`. Withdraw fails once, with no retry.
Two seconds later the starter sends the corrected account itself, then the
approval, and prints `Transfer completed successfully`.

# Now Be the Human

In `src/starter/index.ts`, comment out both `handle.signal(...)` lines, then run
the starter again from the
[button label="Terminal" background="#444CE7"](tab-2). It still prints
`Sending retry signal...`, because that `console.log` line stays, but nothing is
sent. It waits.

Click the [button label="Signals" background="#444CE7"](tab-6). Find the
Workflow by its search attribute, and ask it what it is doing:

```bash,run
WORKFLOW_ID=$(temporal workflow list --query 'TransferStatus="PENDING_FIX"' --limit 1 -o json | jq -r '.[0].execution.workflowId')
echo "$WORKFLOW_ID"
temporal workflow query --workflow-id "$WORKFLOW_ID" --name getStatus
```

```bash,nocopy
Query result:
  QueryResult  "PENDING_FIX"
```

Send the corrected account. `$WORKFLOW_ID` is already set:

```bash,run
temporal workflow signal \
  --workflow-id "$WORKFLOW_ID" \
  --name retry \
  --input '{"key":"fromAccount","value":"account-123"}'
```

Withdraw runs again against `account-123` and succeeds. The status still reads
`PENDING_FIX`, because the next transition this Workflow records is
`APPROVED`. It is now waiting for approval, so give it one:

```bash,run
temporal workflow signal --workflow-id "$WORKFLOW_ID" --name approve --input true
```

Back in the [button label="Terminal" background="#444CE7"](tab-2), the starter
prints the result.

Open the [button label="Temporal UI" background="#444CE7"](tab-3) and look at
the event history: one `ActivityTaskFailed` for the withdraw, then the `retry`
Signal, then a fresh `ActivityTaskScheduled` for the same Activity.

Click **Check** when the transfer completes.

# Key Takeaways

- `ApplicationFailure.nonRetryable()` stops automatic retry for failures that
  data changes, not time, will fix.
- A Workflow can catch the failure, park on `condition()`, and resume.
- Work already completed stays completed. That is the difference from
  restarting the process.
- Signals carry the corrected data in. No redeploy, no manual database edit.
