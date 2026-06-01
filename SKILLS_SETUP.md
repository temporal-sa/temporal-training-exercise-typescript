# Temporal Agent Skills Setup

This repository uses **Temporal agent skills** to guide AI coding agents (GitHub
Copilot, Claude Code, Cursor, Codex, etc.) toward correct, production-ready
Temporal code — and to power **automatic Copilot code review** on every pull
request.

This document explains the official skill repos, how they're installed and kept
in sync, the GitHub Actions that automate everything, and a worked example PR.

---

## What "agent skills" are

A skill is a folder containing a `SKILL.md` (instructions + a `description` the
agent uses to decide when to apply it) plus optional `references/` for depth.
Agents load the skill when a task matches its description. They follow the
[open skills format](https://skills.sh) and are distributed as Git repos.

In this repo the skills are **vendored** (committed) under
[`.agents/skills/`](.agents/skills/) so they travel with the code and are
available to every contributor and to CI.

---

## Official Temporal skill repos

| Skill | Repo | Purpose |
| --- | --- | --- |
| **temporal-developer** | [`temporalio/skill-temporal-developer`](https://github.com/temporalio/skill-temporal-developer) | Build, debug, and manage Temporal apps across Python, TypeScript, Go, Java, .NET, Ruby. Covers determinism, error handling, retries/timeouts, versioning, signals/queries, Continue-As-New, sagas. |
| **temporal-cloud** | [`temporalio/skill-temporal-cloud`](https://github.com/temporalio/skill-temporal-cloud) | Temporal Cloud troubleshooting — connection/auth failures, x509/TLS, namespace & endpoint config, PrivateLink/PSC, HA failover. |
| **temporal-workflow-design-critic** | [`temporalio/skill-temporal-design`](https://github.com/temporalio/skill-temporal-design) | *(Public Preview)* Structured critique of a design doc, architecture spec, pseudocode, or workflow code: Temporal fitness, determinism, anti-patterns, retry/timeout/payload risks, production readiness, versioning & replay safety. Outputs a verdict (approve / approve-with-changes / needs-revision / high-risk) with severity-ranked findings. |

---

## Prerequisites

- Node.js 18+ (the [`skills`](https://www.npmjs.com/package/skills) CLI runs via `npx`).
- Git.
- For Copilot review: a **GitHub Copilot** plan that includes **Copilot code
  review** (Enterprise or Pro+), enabled for the org/repo.

---

## 1. Install the skills for GitHub Copilot

The `skills` CLI installs into each agent's expected location. For Copilot the
project location is `.agents/skills/`. We use `--copy` so real files are
committed (not symlinks to a temp clone):

```bash
# Run from the repo root
npx skills add temporalio/skill-temporal-developer -a github-copilot -s '*' --copy -y
npx skills add temporalio/skill-temporal-cloud     -a github-copilot -s '*' --copy -y
npx skills add temporalio/skill-temporal-design    -a github-copilot -s '*' --copy -y
```

Flags: `-a github-copilot` targets the Copilot agent, `-s '*'` installs all
skills in the repo, `--copy` writes files instead of symlinking, `-y` skips
prompts.

This produces:

```
.agents/skills/
├── temporal-developer/             # SKILL.md + references/
├── temporal-cloud/                 # SKILL.md + references/
└── temporal-workflow-design-critic/# SKILL.md + references/
skills-lock.json                    # records source repo + content hash per skill
```

[`skills-lock.json`](skills-lock.json) pins each skill to its source repo and a
content hash, which is what enables reproducible restores and update detection:

```bash
npx skills experimental_install   # restore the locked skills on a fresh checkout
```

> The same `.agents/skills/` folder is read by other AGENTS.md-aware agents
> (e.g. Gemini CLI). For Claude Code, install with `-a claude-code` instead.

---

## 2. Bridge the skills into Copilot PR review

GitHub Copilot's **PR review bot reads custom instructions from
[`.github/copilot-instructions.md`](.github/copilot-instructions.md)** — it does
**not** load `.agents/skills/` directly (those are for Copilot's *coding agent*
and CLI). So this repo keeps a hand-maintained instructions file that distills
the skill guidance into severity-ranked review criteria (determinism,
versioning/replay safety, retries/timeouts, payload & event-history limits,
task-queue matching, testing) and links back to the full skills.

> ⚠️ `copilot-instructions.md` is **not** auto-synced. When upstream skills
> change materially, update it by hand.

---

## 3. Automated sync with upstream — GitHub Actions

[`.github/workflows/skills-sync.yml`](.github/workflows/skills-sync.yml) keeps
the vendored skills current:

- **Triggers:** weekly (`cron: 0 9 * * 1`, Mondays 09:00 UTC) and on demand
  (`workflow_dispatch`).
- **Updates:** runs `npx skills update --project -y`, which re-fetches each
  source repo, recomputes the content hash, and only rewrites files (and bumps
  `skills-lock.json`) when upstream actually changed.
- **Opens a PR** only when something changed, on a fixed `automation/skills-sync`
  branch (idempotent — re-runs update the same PR), labeled
  `automation` / `dependencies`.
- **Requests Copilot review inline** on that PR. This is deliberate: PRs created
  by the Actions `GITHUB_TOKEN` do **not** fire the `pull_request` event, so the
  auto-review workflow won't trigger on its own — the sync job requests the
  review itself.

### Manual sync

```bash
npx skills update --project -y                       # all vendored skills
npx skills update temporal-developer temporal-cloud -p -y  # specific ones
git diff .agents skills-lock.json                    # review, then commit
```

---

## 4. Automatic Copilot review on every PR — GitHub Actions

[`.github/workflows/copilot-review.yml`](.github/workflows/copilot-review.yml)
requests a Copilot review on each non-draft, same-repo PR
(`opened` / `ready_for_review` / `reopened` / `synchronize`):

1. Looks up Copilot's actor id from the repo's `suggestedActors` (GraphQL).
2. Calls the `requestReviews` mutation with `union: true` so any human
   reviewers already requested are preserved.
3. If the Copilot reviewer isn't available, it logs a `::notice::` and exits
   cleanly — it never fails the PR.

Copilot then reviews using `.github/copilot-instructions.md`, applying the
Temporal guidance.

### Required repository settings

| Setting | Where | Why |
| --- | --- | --- |
| **Copilot code review** enabled | Org/repo Copilot settings | Makes the Copilot reviewer available; otherwise the workflow skips. |
| **Allow GitHub Actions to create and approve pull requests** | Settings → Actions → General | Lets `skills-sync.yml` open its PR. |

> Workflow changes only take effect for `pull_request` events once they're on
> the **default branch**.

---

## 5. Worked example — Sample PR #2

[**PR #2 — Add flawed Temporal workflow fixture to test the temporal-developer skill**](https://github.com/temporal-sa/temporal-training-exercise-typescript/pull/2)

A deliberately broken workflow (`scratch/skill-test/transfer-workflow.ts`) was
opened as a PR to validate the pipeline end to end. The `copilot-review.yml`
workflow auto-requested a review, and **Copilot flagged every planted
anti-pattern** using the instructions file:

| # | Issue Copilot flagged | Temporal principle |
| --- | --- | --- |
| 1 | `proxyActivities({})` with no `startToCloseTimeout` / `scheduleToCloseTimeout` | Activities need bounded timeouts; otherwise they hang and retry unbounded. |
| 2 | `Math.random()` used to build a transfer ID in workflow code | Workflows must be deterministic for replay. |
| 3 | `Date.now()` / `new Date()` read in the workflow | Wall-clock reads are non-deterministic. |
| 4 | `setTimeout()` instead of `sleep()` from `@temporalio/workflow` | Timers must go through the SDK to be durable. |
| 5 | Direct `fetch()` network call inside the workflow | Side effects / I/O belong in Activities. |
| 6 | Returning `"transfer skipped"` instead of surfacing the failure | Don't swallow errors; let the workflow compensate or fail. |
| 7 | Unbounded `while` polling loop | Use Continue-As-New to cap event-history growth. |

This confirms the setup works: skills installed → instructions bridge →
auto-review on PR → accurate, Temporal-aware findings. **The fixture branch is
a test artifact and is not meant to merge.**

---

## File map

| Path | Role |
| --- | --- |
| [`.agents/skills/`](.agents/skills/) | Vendored skill content (committed). |
| [`skills-lock.json`](skills-lock.json) | Pins skills to source repos + content hashes. |
| [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Hand-maintained Temporal review guidance for the Copilot PR bot. |
| [`.github/workflows/copilot-review.yml`](.github/workflows/copilot-review.yml) | Auto-requests Copilot review on each PR. |
| [`.github/workflows/skills-sync.yml`](.github/workflows/skills-sync.yml) | Weekly upstream sync → PR → inline Copilot review. |

---

## Troubleshooting

- **No Copilot review appears on a PR.** Check the **Actions** tab for the
  "Request Copilot PR review" run. A `::notice::` saying the reviewer is
  unavailable means Copilot code review isn't enabled for the repo/org, or your
  plan doesn't include it. You can also add Copilot manually via the PR
  **Reviewers** menu.
- **`skills-sync.yml` can't open a PR.** Enable "Allow GitHub Actions to create
  and approve pull requests" (Settings → Actions → General).
- **Skills look stale.** Run `npx skills update --project -y` and commit the
  diff; check `skills-lock.json` hashes changed.
