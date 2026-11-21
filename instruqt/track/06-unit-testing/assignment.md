---
slug: unit-testing
id: kfqsrbkt0nl7
type: challenge
title: 'Exercise 6: Unit Testing Workflows'
teaser: Test a Workflow that waits for a human, with mocked Activities and an in-process
  test server.
notes:
- type: text
  contents: |-
    # How do you unit test a Workflow that waits two days for approval?

    Not against a shared server that someone else is also using. Not with
    real Activities that fail at random.

    The test starts its own Temporal server in-process, runs the real
    Workflow code against it, and swaps the Activities for mocks.
- type: text
  contents: |-
    # No shared server needed

    `TestWorkflowEnvironment.createLocal()` downloads and starts a
    private dev server for the duration of the test run. Your sandbox has
    the download cached already, so these tests finish in seconds.
tabs:
- id: 6bmeiyxqn1wp
  title: Code Editor
  type: code
  hostname: workshop
  path: /root/workshop/exercise6
- id: wyz1m2kp1wwn
  title: Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop
- id: k4hvnjyds9jx
  title: Terminal
  type: terminal
  hostname: workshop
  workdir: /root/workshop
- id: ycivyhmfysya
  title: Temporal UI
  type: service
  hostname: workshop
  path: /
  port: 8233
- id: at0hoqsoetjr
  title: Solution
  type: code
  hostname: workshop
  path: /root/workshop/solution6
- id: t6x31kqom6um
  title: Network Control Panel
  type: service
  hostname: workshop
  path: /
  port: 5000
difficulty: intermediate
timelimit: 1800
enhanced_loading: null
---

# Unit Testing Workflows

`exercise6` is the finished transfer Workflow from exercises 1 to 5. Your job is
to prove it works, without starting a Worker by hand.

> [!NOTE]
> This exercise does not use the sandbox's dev server. Run everything from
> the [button label="Terminal" background="#444CE7"](tab-2).

# The Code

Open the [button label="Code Editor" background="#444CE7"](tab-0). There is a
new file, `src/workflow.test.ts`, with the test server and the Worker already
wired up. Four TODOs.

### Mock the Activities

The real `withdraw` and `deposit` fail at random. Replace `activities: {}` with
mocks that resolve immediately:

```typescript
activities: {
  withdraw: async () => {},
  deposit: async () => {},
  refund: async () => {},
},
```

The Workflow cannot tell the difference. It only ever saw stand-ins from
`proxyActivities`.

### Three scenarios

**Approved.** Signal, then assert on the result:

```typescript
await handle.signal(approveSignal, true);
const result = await handle.result();
assert.strictEqual(result, 'Transfer completed successfully');
```

**Rejected.** The same with `false`, and `'Transfer rejected and refunded'`.

**Pending.** Before any Signal, Query the status and assert it is `'PENDING'`:

```typescript
const status = await handle.query(getStatusQuery);
assert.strictEqual(status, 'PENDING');
```

Then approve and `await handle.result()`, so the Workflow does not outlive the
test.

> [!IMPORTANT]
> Delete each `// TODO` comment once you have done what it asks. The check
> looks for leftovers.

# Run the Tests

Click the [button label="Terminal" background="#444CE7"](tab-2):

```bash,run
npx mocha --exit exercise6/src/workflow.test.ts --require ts-node/register --timeout 60000
```

```bash,nocopy
  MoneyTransfer Workflow
    ✔ completes successfully when approved
    ✔ refunds when rejected
    ✔ returns PENDING status before approval

  3 passing
```

A missing mock does not fail fast. The Workflow schedules an Activity that no
Worker picks up, and the test times out after a minute. If a test hangs, check
the mocks first.

Click **Check** when all three pass.

# Key Takeaways

- `TestWorkflowEnvironment` gives every test run its own Temporal server.
- Mock Activities at the Worker, not inside the Workflow. The Workflow code
  under test is the code you ship.
- Query a running Workflow inside a test to assert on intermediate state, not
  just the return value.
- Signals and Queries work in tests exactly as they do against a real cluster.
