// Заметка → HTML для PDF. Формулы — в MathML (Chromium рисует их сам, без шрифтов KaTeX),
// весь текст экранируется: в PDF-окно не попадает ни одного скрипта.
import katex from "katex";
import type { Note } from "../../../shared/types";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function inline(text: string): string {
  return text.replace(/\$\$([^$]+)\$\$|\$([^$\n]+)\$|\*\*([^*]+)\*\*|([^$*]+|\$|\*)/g, (_m, block, inl, bold, plain) => {
    if (block !== undefined) return katex.renderToString(block, { displayMode: true, output: "mathml", throwOnError: false });
    if (inl !== undefined) return katex.renderToString(inl, { output: "mathml", throwOnError: false });
    if (bold !== undefined) return `<b>${esc(bold)}</b>`;
    return esc(plain ?? "");
  });
}

export function noteHtml(note: Note): string {
  const blocks = note.body.replace(/\r/g, "").split(/\n{2,}/);
  const body = blocks
    .map((b) => {
      const lines = b.split("\n");
      if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
        const tag = /^\s*\d/.test(lines[0]!) ? "ol" : "ul";
        return `<${tag}>${lines.map((l) => `<li>${inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>`).join("")}</${tag}>`;
      }
      if (/^#{1,3}\s/.test(lines[0]!)) return `<h2>${inline(lines[0]!.replace(/^#+\s/, ""))}</h2>${lines.length > 1 ? `<p>${lines.slice(1).map(inline).join("<br>")}</p>` : ""}`;
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    })
    .join("\n");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(note.title)}</title>
<style>
  @page { margin: 18mm 16mm; }
  body { font: 12pt/1.55 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #15131d; }
  h1 { font-size: 22pt; margin: 0 0 4pt; letter-spacing: -0.02em; }
  .meta { color: #77708f; font-size: 10pt; margin-bottom: 16pt; }
  h2 { font-size: 14pt; margin: 14pt 0 6pt; }
  p, ul, ol { margin: 0 0 8pt; }
  math[display="block"] { margin: 8pt 0; }
</style></head><body>
<h1>${esc(note.title || "Заметка")}</h1>
<div class="meta">${note.subject ? `${esc(note.subject)} · ` : ""}Камадо · ${new Date().toLocaleDateString("ru-RU")}</div>
${body}
</body></html>`;
}
