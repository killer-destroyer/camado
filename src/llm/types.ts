// Общий язык между Камадо и любой моделью. Чтобы подключить другого
// провайдера (например GLM), достаточно реализовать LLMProvider.

/** Уровень задачи. Какая модель стоит за каждым уровнем — решает конфиг. */
export type Tier = "fast" | "brain" | "smart";

export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema входных параметров (type: "object"). */
  inputSchema: Record<string, unknown>;
  /** Выполняет инструмент. Возвращает текст для модели. Ошибки бросает. */
  run(input: unknown): Promise<string>;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Usage {
  /** Готовая цена запроса в $, если её знает сам сервис (OpenRouter) или она нулевая (бесплатный тариф, своя модель). */
  costUsd?: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface AgentRequest {
  tier: Tier;
  /** Блоки системного промпта: стабильные — первыми (так лучше работает кэш). */
  system: string[];
  history: HistoryMessage[];
  userMessage: string;
  tools: ToolDef[];
  /** Картинки и звук к сообщению пользователя (фото доски, голосовое). */
  attachments?: Attachment[];
  /** Сколько раз модель может сходить в инструменты за один ответ. */
  maxSteps?: number;
  /** Вызывается после каждого обращения к модели — для учёта денег. */
  onUsage?: (usage: Usage) => void;
}

export interface Attachment {
  /** image/jpeg, image/png, audio/wav, audio/ogg… */
  mime: string;
  /** Содержимое в base64. */
  data: string;
}

/** Эта модель не умеет такое вложение (например, голос у Claude). */
export class UnsupportedAttachmentError extends Error {}

export interface AgentResult {
  text: string;
  /** Модель отказалась отвечать (сработали фильтры безопасности). */
  refused?: boolean;
}

export interface LLMProvider {
  runAgent(req: AgentRequest): Promise<AgentResult>;
}
