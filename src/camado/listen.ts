// ИИ слушает песню и говорит, на какой секунде начинают петь выбранные строки текста.
// Нужно для подгонки текста по звуку: эти точки потом ложатся в ту же подгонку, что и ручная ⌖.
import type { LLMProvider } from "../llm/types.js";

const SYSTEM = `Ты слушаешь отрывок песни и находишь моменты, когда певец начинает петь заданные строки текста.
Время — в секундах от самого начала этого отрывка (с десятыми). Называй только строки, которые действительно звучат
в отрывке; если строка началась раньше отрывка, её не слышно или ты не уверен — пропусти её.
Ответ — только JSON-массив без пояснений, например: [{"n":3,"t":41.2},{"n":7,"t":88.0}]`;

/** lines — номер строки и её текст; вернёт, на какой секунде записи начинают петь каждую услышанную. */
export async function heardLineTimes(llm: LLMProvider, wavBase64: string, lines: { n: number; text: string }[]): Promise<{ n: number; t: number }[]> {
  const list = lines.map((l) => `${l.n}: ${l.text}`).join("\n");
  const res = await llm.runAgent({
    tier: "brain",
    system: [SYSTEM],
    history: [],
    userMessage: `Строки текста этой песни (номер: текст):\n${list}\n\nКогда начинают петь каждую из них?`,
    tools: [],
    attachments: [{ mime: "audio/wav", data: wavBase64 }],
    maxSteps: 1,
  });
  return parseHeard(res.text, new Set(lines.map((l) => l.n)));
}

/** Достаём из ответа модели пары {n, t}: терпим лишний текст и ```json вокруг. */
export function parseHeard(text: string, allowed: Set<number>): { n: number; t: number }[] {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(m[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const out: { n: number; t: number }[] = [];
  for (const x of raw) {
    const n = Number((x as { n?: unknown }).n);
    let t = (x as { t?: unknown }).t;
    // «1:23.4» тоже понимаем
    if (typeof t === "string" && /^\d+:\d+(\.\d+)?$/.test(t)) {
      const [mm, ss] = t.split(":");
      t = Number(mm) * 60 + Number(ss);
    }
    const sec = Number(t);
    if (allowed.has(n) && Number.isFinite(sec) && sec >= 0 && sec < 3600) out.push({ n, t: sec });
  }
  return out;
}
