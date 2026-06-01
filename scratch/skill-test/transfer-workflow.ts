// TEST FIXTURE — intentionally flawed Temporal code.
//
// This file exists only to exercise the `temporal-developer` skill / Copilot
// code review (see .github/copilot-instructions.md). It deliberately contains
// several Temporal anti-patterns a good review should catch. Do NOT merge it
// into a real exercise/solution — delete before merging the skill setup.

import { proxyActivities, setHandler, defineSignal } from '@temporalio/workflow';
import type * as activities from './activities';

// BUG: no startToCloseTimeout / scheduleToCloseTimeout — activities can hang
// and retry unbounded with no failure surfaced.
const { withdraw, deposit } = proxyActivities<typeof activities>({});

export const approveSignal = defineSignal('approve');

export interface TransferRequest {
  fromAccount: string;
  toAccount: string;
  amount: number;
}

export async function transfer(request: TransferRequest): Promise<string> {
  // BUG: Math.random() in workflow code is non-deterministic and breaks replay.
  const transferId = `transfer-${Math.random().toString(36).slice(2)}`;

  // BUG: Date.now() / new Date() read wall-clock time — non-deterministic.
  const startedAt = Date.now();
  console.log(`Starting ${transferId} at ${new Date().toISOString()}`);

  let approved = false;
  setHandler(approveSignal, () => {
    approved = true;
  });

  // BUG: setTimeout instead of the workflow-safe sleep() from
  // @temporalio/workflow — timers must go through the SDK to be durable.
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // BUG: direct network I/O inside a workflow — side effects belong in activities.
  const res = await fetch(`https://api.example.com/limits/${request.fromAccount}`);
  const limit = await res.json();
  if (request.amount > limit.max) {
    // BUG: swallowing the error and returning a "success-ish" string hides failures.
    return 'transfer skipped';
  }

  await withdraw(request.fromAccount, request.amount);
  await deposit(request.toAccount, request.amount);

  // BUG: unbounded loop with no Continue-As-New — event history grows forever.
  while (!approved) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const elapsed = Date.now() - startedAt;
  return `Transfer completed successfully in ${elapsed}ms`;
}
