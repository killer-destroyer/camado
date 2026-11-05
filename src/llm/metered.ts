import type { Store } from "../store.js";
import { costOf } from "./pricing.js";
import type { AgentRequest, AgentResult, LLMProvider } from "./types.js";

export class BudgetExceededError extends Error {
  constructor(
    public spentUsd: number,
    public budgetUsd: number,
  ) {
    super(`Месячный лимит исчерпан: потрачено $${spentUsd.toFixed(2)} из $${budgetUsd.toFixed(2)}`);
  }
}

export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Обёртка над любой моделью: считает деньги и не даёт выйти за лимит. */
export class MeteredProvider implements LLMProvider {
  constructor(
    private inner: LLMProvider,
    private store: Store,
    private budgetUsd: number,
    private now: () => Date = () => new Date(),
  ) {}

  spentThisMonth(): number {
    return this.store.spentSince(monthStart(this.now()));
  }

  async runAgent(req: AgentRequest): Promise<AgentResult> {
    const spent = this.spentThisMonth();
    if (spent >= this.budgetUsd) throw new BudgetExceededError(spent, this.budgetUsd);
    return this.inner.runAgent({
      ...req,
      onUsage: (usage) => {
        this.store.recordUsage({ ...usage, costUsd: costOf(usage) });
        req.onUsage?.(usage);
      },
    });
  }
}
