---
slug: activity-summaries
type: challenge
title: 'Exercise 5: Activity Summaries and Metadata'
teaser: Make the event history readable. Attach a one-line summary to every Activity.
notes:
- type: text
  contents: |-
    # Three Activities named withdraw, deposit and refund. Which account?

    You are on a call. Someone shares an event history. It says
    `withdraw`, `deposit`, `refund`.

    It does not say whose money, or how much. That detail was in the
    payload, and nobody wants to click into three payloads on a call.
- type: text
  contents: |-
    # Did you know?

    Activity summaries are user metadata. They render in the Web UI beside
    the event, they cost nothing at runtime, and they are not part of
    Workflow logic. Changing a summary string does not break replay.
tabs:
- title: Code Editor
  type: code
  hostname: workshop
  path: /root/workshop/exercise5
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
  path: /root/workshop/solution5
- title: Network Control Panel
  type: service
  hostname: workshop
  path: /
  port: 5000
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Activity Summaries and Metadata

The Workflow already works. This exercise makes it legible to whoever debugs
it at 3am.

# The Code

Open the [button label="Code Editor" background="#444CE7"](tab-0) and go to
the top of `src/workflow.ts`.

A `summary` is an option on `proxyActivities`, so one call can only give one
summary. Split the single call into one per Activity. The summaries need the
account, which is only known inside `transfer`, so move the calls there:

```typescript
export async function transfer(request: TransferRequest): Promise<string> {
  const { withdraw } = proxyActivities<typeof activities>({
    startToCloseTimeout: '5 seconds',
    summary: `Withdrawing funds from account ${request.fromAccount}`,
  });
  // ...same for deposit (toAccount) and refund (fromAccount)
```

Use these three summaries:

| Activity | Summary |
|----------|---------|
| `withdraw` | `Withdrawing funds from account ${request.fromAccount}` |
| `deposit` | `Depositing funds to account ${request.toAccount}` |
| `refund` | `Refunding funds to account ${request.fromAccount}` |

> [!IMPORTANT]
> Delete each `// TODO` comment once you have done what it asks. The check
> looks for leftovers.

# Run It

Click the [button label="Worker" background="#444CE7"](tab-1):

```bash,run
npx ts-node exercise5/src/worker/index.ts
```

Click the [button label="Terminal" background="#444CE7"](tab-2):

```bash,run
npx ts-node exercise5/src/starter/index.ts
```

# See the Difference

Click the [button label="Temporal UI" background="#444CE7"](tab-3). Click your
Workflow at the top of the list. Refresh if it is not there.

Open the **Event History** and look at the Activity rows: each one now says
which account it touched and which direction the money went. Compare that
against an exercise 2 execution further down the list.

Click **Check** when the summaries show up.

# Key Takeaways

- `summary` on `proxyActivities` labels an Activity in the UI.
- One `proxyActivities` call per distinct summary. They are cheap.
- Summaries are user metadata. They do not affect Workflow logic or replay.
- Keep them short and specific. They are read at a glance, under pressure.
