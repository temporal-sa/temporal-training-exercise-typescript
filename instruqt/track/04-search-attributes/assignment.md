---
slug: search-attributes
type: challenge
title: 'Exercise 4: Money Transfer with Search Attributes'
teaser: Tag a Workflow with business identifiers, then find it by account and by status
  instead of its Workflow ID.
notes:
- type: text
  contents: |-
    # Support asks about account-123. You have 40,000 Workflows. Now what?

    You do not have the Workflow ID. You have an account number.

    A search attribute makes that account number queryable across every
    execution the cluster has ever seen. A second one tells you which of
    them are stuck.
- type: text
  contents: |-
    # Registered up front

    Custom search attributes have to be registered on the cluster before a
    Workflow can set one, so `AccountId=Keyword` and
    `TransferStatus=Keyword` are already registered on your dev server.

    Try it without that registration and the Workflow Task fails outright.
tabs:
- title: Code Editor
  type: code
  hostname: workshop
  path: /root/workshop/exercise4
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
  path: /root/workshop/solution4
- title: Network Control Panel
  type: service
  hostname: workshop
  path: /
  port: 5000
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Money Transfer with Search Attributes

Two search attributes. One set when the Workflow starts, one kept current as it
runs.

# The Code

Open the [button label="Code Editor" background="#444CE7"](tab-0).

### `src/starter/index.ts`: AccountId, at start

Uncomment the `searchAttributes` option on `client.workflow.start()`:

```typescript
searchAttributes: {
  AccountId: [request.fromAccount],
},
```

The account never changes, so it is set once by the client.

### `src/workflow.ts`: TransferStatus, as it changes

Each TODO marks a transition. Replace it with an upsert of the new status:

```typescript
upsertSearchAttributes({ TransferStatus: ['PENDING'] });
```

`PENDING` at the start, `FAILED` in each `catch`, `APPROVED` before the
deposit, `COMPLETED` after it, `CANCELLED` after the refund.
`upsertSearchAttributes` is already imported.

> [!IMPORTANT]
> Delete each `// TODO` comment once you have done what it asks. The check
> looks for leftovers.

# Run It

Click the [button label="Worker" background="#444CE7"](tab-1):

```bash,run
npx ts-node exercise4/src/worker/index.ts
```

Click the [button label="Terminal" background="#444CE7"](tab-2):

```bash,run
npx ts-node exercise4/src/starter/index.ts
```

The starter uses `account-123` as the source account.

# Find It

From the [button label="Terminal" background="#444CE7"](tab-2):

```bash,run
temporal workflow list --query 'AccountId="account-123"'
temporal workflow list --query 'AccountId="account-123" AND TransferStatus="COMPLETED"'
```

Now filter on an account that never sent anything:

```bash,run
temporal workflow list --query 'AccountId="account-999"'
```

Empty. The filter is doing real work.

# See It In the UI

Click the [button label="Temporal UI" background="#444CE7"](tab-3). Click your
Workflow and look at the summary panel: `AccountId` and `TransferStatus` are
listed there with their values.

Back on the Workflows list, put this in the search box:

```bash,nocopy
TransferStatus="COMPLETED"
```

Click **Check** when the query returns your Workflow.

# Key Takeaways

- `searchAttributes` on `client.workflow.start()` tags an execution from birth.
- `upsertSearchAttributes()` changes a tag from inside the Workflow as state moves.
- Custom attributes must be registered on the cluster first. The dev server
  takes `--search-attribute Name=Type`.
- Search attributes are for finding Workflows, not for storing Workflow state.
  Keep them small.
