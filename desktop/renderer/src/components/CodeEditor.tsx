// Редактор кода: прозрачное поле ввода поверх подсветки. Tab — отступ, Enter — сохраняет отступ строки.
import { useRef, type KeyboardEvent } from "react";
import { highlight } from "../lib/highlight";

const INDENT = "    ";

export function CodeEditor({ value, onChange, lang, minRows = 10 }: { value: string; onChange: (v: string) => void; lang: string; minRows?: number }) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const pre = useRef<HTMLPreElement>(null);

  const edit = (next: string, caret: number) => {
    onChange(next);
    requestAnimationFrame(() => {
      if (ta.current) ta.current.selectionStart = ta.current.selectionEnd = caret;
    });
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const { selectionStart: a, selectionEnd: b, value: v } = el;
    if (e.key === "Tab") {
      e.preventDefault();
      const lineStart = v.lastIndexOf("\n", a - 1) + 1;
      if (e.shiftKey) {
        // убрать отступ у текущей строки
        const cut = v.slice(lineStart, lineStart + INDENT.length).match(/^ {1,4}/)?.[0].length ?? 0;
        if (cut) edit(v.slice(0, lineStart) + v.slice(lineStart + cut), Math.max(lineStart, a - cut));
      } else edit(v.slice(0, a) + INDENT + v.slice(b), a + INDENT.length);
    } else if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const lineStart = v.lastIndexOf("\n", a - 1) + 1;
      const line = v.slice(lineStart, a);
      let indent = line.match(/^\s*/)?.[0] ?? "";
      if (/[:{[(]\s*$/.test(line) || /<(?!\/)(?!(?:br|img|meta|link|input|hr)\b)[\w-][^>]*>\s*$/.test(line)) indent += INDENT;
      edit(v.slice(0, a) + "\n" + indent + v.slice(b), a + 1 + indent.length);
    }
  };

  const sync = () => {
    if (pre.current && ta.current) {
      pre.current.scrollTop = ta.current.scrollTop;
      pre.current.scrollLeft = ta.current.scrollLeft;
    }
  };

  const rows = Math.max(minRows, value.split("\n").length + 1);
  return (
    <div className="code-editor" style={{ ["--rows" as string]: Math.min(rows, 28) }}>
      <pre ref={pre} className={`ce-hl lang-${lang}`} aria-hidden>
        <code>
          {highlight(value, lang)}
          {"\n"}
        </code>
      </pre>
      <textarea
        ref={ta}
        className="ce-input"
        value={value}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        onScroll={sync}
      />
    </div>
  );
}
