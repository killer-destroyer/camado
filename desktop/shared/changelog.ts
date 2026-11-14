// «Что нового»: разбор файла изменений (changelog.md) — для окна после обновления, истории версий и релиза.
import { isNewer } from "./version.js";

export interface ChangelogEntry {
  version: string;
  date?: string;
  items: string[];
}

/** «## 1.2.0 · 2026-11-08» и пункты «- …» под ним. Многострочный пункт склеивается. */
export function parseChangelog(text: string): ChangelogEntry[] {
  const out: ChangelogEntry[] = [];
  let cur: ChangelogEntry | undefined;
  const body = text.replace(/\r/g, "").replace(/<!--[\s\S]*?-->/g, "");
  for (const raw of body.split("\n")) {
    const line = raw.trimEnd();
    const h = /^##\s+v?([\d.]+[\w.-]*)\s*(?:[·|—-]\s*(\d{4}-\d{2}-\d{2}))?\s*$/.exec(line);
    if (h) {
      cur = { version: h[1]!, date: h[2], items: [] };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    const it = /^\s*[-*]\s+(.*)$/.exec(line);
    if (it) cur.items.push(it[1]!.trim());
    else if (line.trim() && cur.items.length) cur.items[cur.items.length - 1] += ` ${line.trim()}`;
  }
  return out.filter((e) => e.items.length);
}

/** Изменения новее `from` и не новее `to` (from не указан — только сама `to`). */
export function changesBetween(entries: ChangelogEntry[], from: string | undefined, to: string): ChangelogEntry[] {
  return entries.filter((e) => !isNewer(e.version, to) && (from ? isNewer(e.version, from) : e.version === to));
}

/** Текст релиза на GitHub для одной версии. */
export function releaseNotes(entries: ChangelogEntry[], version: string): string {
  const e = entries.find((x) => x.version === version);
  return e ? e.items.map((i) => `- ${i}`).join("\n") : "";
}
