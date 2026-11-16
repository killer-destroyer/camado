// Дописывает «out:» к тестам задач, прогоняя эталонное решение (=== … ===) настоящим Python/Java/C++.
// Так ответы в тестах не пишутся руками и не ошибаются. Запуск: npx tsx scripts/fill-outputs.mts [--all]
// --all — пересчитать и уже записанные ответы.
import { readFileSync, writeFileSync } from "node:fs";
import { detectTools, runCode, type RunLang } from "../desktop/main/runner.ts";

const ALL = process.argv.includes("--all");
const FILES: [string, RunLang][] = [
  ["desktop/shared/courses/python.md", "python"],
  ["desktop/shared/courses/java.md", "java"],
  ["desktop/shared/courses/cpp.md", "cpp"],
  ["desktop/shared/courses/problems.md", "python"],
];
const tools = await detectTools();
const esc = (s: string) => s.replace(/\r/g, "").split("\n").map((l) => l.trimEnd()).join("\n").replace(/\n+$/, "").replace(/\n/g, "\\n");
const unesc = (s: string) => s.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
let total = 0;
let failed = 0;

for (const [file, lang] of FILES) {
  let lines: string[];
  try {
    lines = readFileSync(file, "utf8").replace(/\r/g, "").split("\n");
  } catch {
    continue;
  }
  const isStart = (l: string) => l.startsWith("!! ") || /^## +[\w-]+ *\|/.test(l);
  const isEnd = (l: string) => isStart(l) || l.startsWith("?? ") || l.startsWith("card: ") || /^### +Модуль/.test(l);
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!isStart(lines[i]!)) {
      out.push(lines[i++]!);
      continue;
    }
    // блок задачи
    const block: string[] = [lines[i++]!];
    let inCode = false;
    while (i < lines.length) {
      const l = lines[i]!;
      if (!inCode && block.length > 0 && isEnd(l) && !(l.startsWith("## ") && false)) break;
      if (l.trim() === "===" || l.trim() === "<<<") inCode = !inCode;
      block.push(l);
      i++;
    }
    const sol: string[] = [];
    let s = -1;
    block.forEach((l, k) => {
      if (l.trim() === "===") s = s === -1 ? k : (sol.push(...block.slice(s + 1, k)), -2);
    });
    const hasIn = block.some((l) => l.startsWith("in:"));
    if (!hasIn || !sol.length) {
      out.push(...block);
      continue;
    }
    // какие in: без out:
    const work: { k: number; input: string; has: boolean }[] = [];
    block.forEach((l, k) => {
      if (l.startsWith("in:")) work.push({ k, input: unesc(l.slice(3).trim()), has: !!block[k + 1]?.startsWith("out:") });
    });
    const need = work.filter((w) => ALL || !w.has);
    if (!need.length) {
      out.push(...block);
      continue;
    }
    const res = await runCode(tools, lang, sol.join("\n"), need.map((w) => w.input), 20000);
    if ("error" in res) throw new Error(`${file}: ${res.error}`);
    const outs = new Map<number, string>();
    need.forEach((w, n) => {
      const r = res[Math.min(n, res.length - 1)]!;
      total++;
      if (!r.ok || r.compile) {
        failed++;
        console.error(`ОШИБКА ${file}: ${block[0]!.slice(0, 70)}\n  вход: ${w.input.slice(0, 80)}\n  ${(r.stderr || "").slice(0, 400)}`);
      } else outs.set(w.k, `out: ${esc(r.stdout)}`);
    });
    const nb: string[] = [];
    block.forEach((l, k) => {
      if (ALL && l.startsWith("out:") && block[k - 1]?.startsWith("in:") && outs.has(k - 1)) return; // старый ответ заменяем
      nb.push(l);
      if (outs.has(k)) nb.push(outs.get(k)!);
    });
    out.push(...nb);
  }
  writeFileSync(file, out.join("\n"));
  console.log(`${file}: готово`);
}
console.log(`посчитано ответов: ${total}, ошибок: ${failed}`);
if (failed) process.exit(1);
