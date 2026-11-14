import { z } from "zod";
import type { ToolDef } from "./types.js";

/**
 * Описывает инструмент через zod-схему: из неё получается JSON Schema для
 * модели, и по ней же проверяется то, что модель прислала.
 */
export function defineTool<S extends z.ZodObject>(def: {
  name: string;
  description: string;
  schema: S;
  run: (input: z.infer<S>) => Promise<string> | string;
}): ToolDef {
  const { $schema: _ignored, ...inputSchema } = z.toJSONSchema(def.schema, { io: "input" }) as Record<string, unknown>;
  return {
    name: def.name,
    description: def.description,
    inputSchema,
    async run(input: unknown) {
      // CAMADO_TOOL_LOG=1 — печатать вызовы инструментов (для отладки)
      const log = typeof process !== "undefined" && process.env?.CAMADO_TOOL_LOG ? (m: string) => console.error(`[tool ${def.name}] ${m.slice(0, 600)}`) : undefined;
      log?.(JSON.stringify(input));
      const parsed = def.schema.safeParse(input);
      if (!parsed.success) {
        log?.(`неверные параметры: ${parsed.error.message}`);
        throw new Error(`Неверные параметры: ${z.prettifyError(parsed.error)}`);
      }
      const out = await def.run(parsed.data);
      log?.(`→ ${out}`);
      return out;
    },
  };
}
