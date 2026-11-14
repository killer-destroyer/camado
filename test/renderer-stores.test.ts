// Подписка на состояние окна должна возвращать одно и то же значение, пока данные не поменялись.
// Новый `{}` или `[]` на каждый вызов — бесконечная перерисовка (так падал «Задачник» у нового пользователя).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

describe("подписки окна на состояние", () => {
  it("не создают новый объект или массив на каждый вызов", () => {
    const bad: string[] = [];
    for (const f of files(fileURLToPath(new URL("../desktop/renderer/src", import.meta.url)))) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/useStore\(\s*\w+\s*,\s*\([^)]*\)\s*=>([^;]*?)\)\s*;/g)) {
        const body = m[1]!;
        if (/\?\?\s*(\{\s*\}|\[\s*\])|\|\|\s*(\{\s*\}|\[\s*\])|\.(filter|map|slice|concat)\(|\{\s*\.\.\.|\[\s*\.\.\./.test(body)) bad.push(`${f.split(/[\\/]src[\\/]/)[1]}: ${m[0].slice(0, 120)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
