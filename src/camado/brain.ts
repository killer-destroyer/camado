import type { LLMProvider, ToolDef } from "../llm/types.js";
import type { Store } from "../store.js";
import { nowLine } from "../time.js";
import { memoryBlock, PERSONA } from "./persona.js";
import { buildTools } from "./tools.js";

const HISTORY_LIMIT = 20;

export interface IncomingMessage {
  text: string;
  /** Если сообщение переслано — от кого (человек, чат или канал). */
  forwardedFrom?: string;
}

/** Мозг Камадо: собирает контекст, зовёт модель, сохраняет разговор. */
export class Camado {
  private tools: ToolDef[];

  constructor(
    private store: Store,
    private llm: LLMProvider,
    private timeZone: string,
    private now: () => Date = () => new Date(),
  ) {
    this.tools = buildTools(store, timeZone);
  }

  async handle(msg: IncomingMessage): Promise<string> {
    const header = nowLine(this.now(), this.timeZone);
    const body = msg.forwardedFrom
      ? `[Пересланное сообщение от: ${msg.forwardedFrom}]\n${msg.text}`
      : msg.text;
    const userMessage = `${header}\n${body}`;

    const result = await this.llm.runAgent({
      tier: "brain",
      system: [PERSONA, memoryBlock(this.store.listMemory())],
      history: this.store.recentChat(HISTORY_LIMIT),
      userMessage,
      tools: this.tools,
    });

    const answer = result.refused
      ? "Модель отказалась отвечать на это сообщение. Попробуй сформулировать по-другому."
      : result.text || "Готово.";

    this.store.appendChat("user", userMessage);
    this.store.appendChat("assistant", answer);
    return answer;
  }
}
