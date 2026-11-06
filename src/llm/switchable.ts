import type { AgentRequest, AgentResult, LLMProvider } from "./types.js";

export class NoApiKeyError extends Error {
  constructor() {
    super("Ключ API не задан");
  }
}

/**
 * Мозг, который можно включить и выключить на ходу: без ключа Камадо
 * работает в ручном режиме, с ключом — на полную.
 */
export class SwitchableProvider implements LLMProvider {
  private current: LLMProvider | undefined;

  constructor(
    private factory: (apiKey: string) => LLMProvider,
    apiKey?: string,
  ) {
    this.setKey(apiKey);
  }

  setKey(apiKey: string | undefined): void {
    this.current = apiKey ? this.factory(apiKey) : undefined;
  }

  /** Подключить любую модель (или выключить ИИ — undefined). */
  setProvider(provider: LLMProvider | undefined): void {
    this.current = provider;
  }

  get enabled(): boolean {
    return this.current !== undefined;
  }

  runAgent(req: AgentRequest): Promise<AgentResult> {
    if (!this.current) return Promise.reject(new NoApiKeyError());
    return this.current.runAgent(req);
  }
}
