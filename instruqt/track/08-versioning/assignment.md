---
slug: versioning
id: zpjyjnuwkeuk
type: challenge
title: 'Exercise 8: Workflow Versioning with the Patching API'
teaser: Add a step to a Workflow that already has executions in flight. Prove the
  old histories still replay.
notes:
- type: text
  contents: |-
    # You shipped it. Four thousand are still running. Now change the logic.

    Add one Activity call in the middle of a Workflow and every execution
    started before the deploy has a history that no longer matches the
    code.

    Temporal calls that a non-determinism error, and it will not guess.
- type: text
  contents: |-
    # Did you know?

    `patched('add-notification')` returns `false` when replaying a history
    recorded before the patch existed, and `true` for anything new.

    One boolean, two versions of the same Workflow, running on the same
    Worker at the same time.
tabs:
- id: 0rqdjfrfkpyt
  title: Code Editor
  type: code
  hostname: workshop
  path: /root/workshop/exercise8
- id: so119cl4mgcy
  title: Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop
- id: xg1vqcap6iat
  title: Terminal
  type: terminal
  hostname: workshop
  workdir: /root/workshop
- id: susswzjjedaf
  title: Temporal UI
  type: service
  hostname: workshop
  path: /
  port: 8233
- id: qywofxxafnyj
  title: Solution
  type: code
  hostname: workshop
  path: /root/workshop/solution8
- id: ykk4uhch8ehi
  title: Network Control Panel
  type: service
  hostname: workshop
  path: /
  port: 5000
difficulty: advanced
timelimit: 1800
enhanced_loading: null
---

# Workflow Versioning with the Patching API

Version 1 withdraws, waits, deposits. Version 2 also sends a notification.
Both have to work, on the same Worker, at the same time.

# The Code

Open the [button label="Code Editor" background="#444CE7"](tab-0). Six TODOs
across three files under `src/`.

### Task 1: the new Activity

In `activities.ts`, uncomment it:

```typescript
export async function sendNotification(account: string, amount: number): Promise<void> {
  log.info('Sending notification', { amount, account });
}
```

### Task 2: gate it behind a patch

In `workflow.ts`, add `patched` to the `@temporalio/workflow` import and
`sendNotification` to the `proxyActivities` destructuring. Then, after the
deposit:

```typescript
if (patched('add-notification')) {
  await sendNotification(updatedRequest.toAccount, updatedRequest.amount);
}
```

Only on the approved path. A rejected transfer refunds and sends nothing.

> [!WARNING]
> Change IDs are permanent. `add-notification` goes into the event history
> as a marker. Renaming it later breaks every history that recorded the old
> name.

### Task 3: the tests

In `workflow.test.ts`, add the `sendNotification: async () => {}` mock. The
new-execution test runs the patched path, so without it the test hangs on an
Activity nobody can run.

Then write the replay test. `src/workflow-history-v1.json` is already there,
recorded from the pre-patch version of this Workflow. It is plain JSON, so
`runReplayHistory` takes it as parsed. Add `fs` and `path` imports at the top:

```typescript
import * as fs from 'fs';
import * as path from 'path';
```

and replace the commented-out test with:

```typescript
it('should replay old workflow history without notification', async () => {
  const historyPath = path.join(__dirname, 'workflow-history-v1.json');
  const history = JSON.parse(await fs.promises.readFile(historyPath, 'utf8'));

  await Worker.runReplayHistory(
    { workflowsPath: require.resolve('./workflow') },
    history,
  );
});
```

The commented-out version in the file decodes a base64 protobuf history. That
is a different export format from the one seeded here; use the snippet above.

> [!IMPORTANT]
> Delete each `// TODO` comment once you have done what it asks. The check
> looks for leftovers.

# Run the New Version

Click the [button label="Worker" background="#444CE7"](tab-1):

```bash,run
npx ts-node exercise8/src/worker/index.ts
```

Click the [button label="Terminal" background="#444CE7"](tab-2):

```bash,run
npx ts-node exercise8/src/starter/index.ts
```

Open the [button label="Temporal UI" background="#444CE7"](tab-3) and look at
the event history. Two things to find: a `MarkerRecorded` event for the patch,
and the `sendNotification` Activity after the deposit.

# Prove the Old One Still Replays

Click the [button label="Terminal" background="#444CE7"](tab-2):

```bash,run
npx mocha --exit exercise8/src/workflow.test.ts --require ts-node/register --timeout 60000
```

```bash,nocopy
  ✔ should execute new workflow with notification
  ✔ should replay old workflow history without notification

  2 passing
```

The first proves the new path runs the notification. The second proves a
history recorded before the patch existed still replays against the new code.

Now break it deliberately. Remove the `if (patched(...))` wrapper, leave the
`sendNotification` call in place, and rerun the tests. The replay test fails
with a non-determinism error, because the old history has no record of that
Activity. Put the patch back.

Click **Check** when both tests pass.

# Key Takeaways

- `patched(id)` is `false` for histories recorded before the patch, `true` for
  new executions.
- The patch decision is written to history as a marker, so replay makes the
  same choice every time.
- Change IDs are permanent. Pick a name you can live with.
- `Worker.runReplayHistory` against a saved history is the test that catches
  non-determinism before your users do.
- Once every pre-patch execution has finished, `deprecatePatch()` starts the
  cleanup.
