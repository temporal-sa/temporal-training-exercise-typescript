# Temporal in Practice: Instruqt Track (TypeScript)

The eight exercises in this repo, packaged as an Instruqt lab. Attendees get a
container sandbox with a Temporal dev server already running and `npm install`
already done, the code editor on the exercise directory, and the finished
solution one tab away.

```
instruqt/
├── track/       8 challenge directories + track.yml   ->  instruqt track push
└── sandbox/     config.yml + scripts/                 ->  instruqt sandbox push
                 proxy/                                ->  git push
```

Ported from the Python track in `temporal-sa/temporal-training-exercise-python`.

## Three ways a change ships

| What you edited | How it ships | Live at |
|---|---|---|
| `track/` (assignments, lifecycle scripts, `track.yml`) | `instruqt track push` | next lab start |
| `sandbox/config.yml`, `sandbox/scripts/` | `instruqt sandbox push` then `publish` | next sandbox provision |
| `sandbox/proxy/`, `exercise*/`, `solution*/` | `git push` to `WORKSHOP_REF` | next sandbox provision |

The track and the sandbox preset are separate Instruqt entities. The track
carries no `config.yml` and no `track_scripts/`; `track.yml` names the preset:

```yaml
sandbox_preset: temporal-in-practice-sandbox-typescript
```

> [!IMPORTANT]
> Exercise code and the proxy files are part of neither push. They reach the
> sandbox through the `git clone` that `sandbox/scripts/setup-workshop` runs at
> provision time, so an edit is live only once it is pushed to the ref
> `WORKSHOP_REF` names (default `main`). That includes this `instruqt/`
> directory: provisioning fails until `instruqt/sandbox/proxy/` is on that ref.

Authenticate once with `instruqt auth login`.

## First push: preset before track

`instruqt track validate` resolves `sandbox_preset` against Instruqt, so it
fails with `Entity not found` until the preset exists. Push the preset first:

```bash
cd instruqt/sandbox
instruqt sandbox push
instruqt sandbox publish --message="Initial TypeScript preset"

cd ../track
instruqt track validate
instruqt track push        # creates the track and writes ids into the files
```

The first `track push` writes `id:` fields into `track.yml` and every
`assignment.md`, plus a `checksum`. Commit those so later pushes update the
same track instead of creating another one.

## Pushing the track

Run from `instruqt/track/`:

```bash
instruqt track validate    # needs the preset to exist remotely
instruqt track push
instruqt track pull        # ids for any new challenge or tab, then commit
instruqt track test        # runs every solve script in order, end to end
```

`instruqt track push` rewrites `track.yml` and every `assignment.md`
**frontmatter** in place: comments stripped, keys reordered, block scalars
collapsed. Commit that as-is rather than prettifying it, and keep durable
explanation in this README instead of in YAML comments.

> [!IMPORTANT]
> Never edit the track in the web UI while editing locally. Some settings are
> web-UI authoritative no matter what you push: `idle_timeout`, Hot Start, and
> invite configuration.

Two things that break a push or silently reorder the lab:

- **Every file in a challenge directory is parsed as a lifecycle script.** A
  stray file next to `assignment.md` breaks the track.
- **Challenge order comes from directory sort order**, so the `NN-` prefixes
  have to stay sequential and `track.yml` must have no `challenges:` block.
  Lifecycle script names carry the preset's hostname (`-workshop`).

## How the checks work

Exercises 2 to 8 all run on `money-transfer-task-queue`, so "a transfer
completed" would be satisfied by a run from an earlier challenge. Each
challenge's `setup-workshop` therefore writes a UTC timestamp to
`/tmp/workshop-challenge-NN.started`, and the check only counts Workflows with
`StartTime` after it. Beyond that, each check gates on:

| Challenge | Code gate | Temporal gate |
|---|---|---|
| 01 | TODOs gone | a `greet` run returned `Hello, Temporal!` |
| 02 | TODOs gone, `setHandler(approveSignal` | a transfer completed after a Signal |
| 03 | TODOs gone, `setHandler(getStatusQuery`, every status set | a transfer completed |
| 04 | TODOs gone, `upsertSearchAttributes` | a run has `AccountId="account-123" AND TransferStatus="COMPLETED"` |
| 05 | TODOs gone, three `summary:` options | a transfer's history has `userMetadata` |
| 06 | test file has no TODOs, Queries and asserts | mocha: 3 passing |
| 07 | TODOs gone, `nonRetryable`, `setHandler(retrySignal` | a transfer completed after `ActivityTaskFailed` and a `retry` Signal |
| 08 | TODOs gone, `sendNotification`, `patched('add-notification')`, `runReplayHistory` | mocha: 2 passing, and a run executed `sendNotification` |

Exercise 6 ships in the repo as a finished Workflow with no test file. Its
`setup-workshop` writes a scaffold `exercise6/src/workflow.test.ts` with four
TODOs, unless the file already exists.

Every check was run in the Docker loop in `sandbox/README.md`: it fails on the
untouched exercise and passes after the solve script.

## Before a live workshop

A warm Hot Start pool holds sandboxes built from the preset version and
`WORKSHOP_REF` that were current when it was warmed. Re-warm after any preset
publish, exercise change, or `WORKSHOP_REF` bump, then launch one pooled
sandbox and click through a challenge.

- [ ] **`WORKSHOP_REF` pinned** to a tag or commit in
      `sandbox/scripts/setup-workshop`.
- [ ] **Exercise and `proxy/` changes pushed** to that ref.
- [ ] **Preset published**, if `config.yml` or `scripts/` changed.
- [ ] **`maintenance: false`** in `track.yml`, pushed. It ships `true`, so only
      owners and authors can launch.
- [ ] **Hot Start enabled**, pool sized to attendees plus 10 to 20 percent,
      warmed well ahead of the session.
- [ ] **`idle_timeout` set in the web UI** (Track, Settings, Additional
      Settings) to workshop length plus 20 minutes.
- [ ] **`feedback_recap_enabled` and `feedback_tab_enabled` set to `false`** if
      feedback is collected out of band.
- [ ] **`instruqt track test` passes.**

Afterwards, disable Hot Start if the pool was sized for this session.

No `secrets:` are declared, so there is nothing to populate under Track
Settings, Secrets.
