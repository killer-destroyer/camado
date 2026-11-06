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
      const parsed = def.schema.safeParse(input);
      if (!parsed.success) {
        throw new Error(`Неверные параметры: ${z.prettifyError(parsed.error)}`);
      }
      return def.run(parsed.data);
    },
  };
}
