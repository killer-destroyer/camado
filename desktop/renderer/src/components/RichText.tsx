// Текст с формулами и простым оформлением: $формула$, $$формула по центру$$, **жирный**, списки, абзацы.
// HTML из текста не вставляется: формулы рисует KaTeX (он экранирует всё сам), остальное — React-элементы.
import katex from "katex";
import "katex/dist/katex.min.css";
import { Fragment, type ReactNode } from "react";
import { highlight, normLang } from "../lib/highlight";

function formula(tex: string, display: boolean, key: string): ReactNode {
  try {
    const html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", trust: false, output: "html" });
    return <span key={key} className={display ? "rt-math display" : "rt-math"} dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <code key={key}>{tex}</code>;
  }
}

/** Строка → куски: формулы, **жирный**, `код`. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\$\$([^$]+)\$\$|\$([^$\n]+)\$|\*\*([^*]+)\*\*|`([^`]+)`|(?<![\w*])\*(?![\s*])([^*\n]+?)(?<!\s)\*(?![\w*])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={`${keyBase}t${i}`}>{text.slice(last, m.index)}</Fragment>);
    if (m[1] !== undefined) out.push(formula(m[1], true, `${keyBase}m${i}`));
    else if (m[2] !== undefined) out.push(formula(m[2], false, `${keyBase}m${i}`));
    else if (m[3] !== undefined) out.push(<b key={`${keyBase}b${i}`}>{m[3]}</b>);
    else if (m[4] !== undefined) out.push(<code key={`${keyBase}c${i}`}>{m[4]}</code>);
    else if (m[5] !== undefined) out.push(<em key={`${keyBase}i${i}`}>{m[5]}</em>);
    last = re.lastIndex;
    i++;
  }
  if (last < text.length) out.push(<Fragment key={`${keyBase}e`}>{text.slice(last)}</Fragment>);
  return out;
}

/** Текст → куски: обычный текст и блоки ```код```. */
function splitFences(text: string): { code?: string; lang?: string; text?: string }[] {
  const out: { code?: string; lang?: string; text?: string }[] = [];
  const re = /```([\w+#-]*)[^\n]*\n([\s\S]*?)(?:\n```|$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ code: m[2]!.replace(/\n$/, ""), lang: m[1] || undefined });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = splitFences(text.replace(/\r/g, ""));
  return (
    <div className={`rich ${className ?? ""}`}>
      {parts.map((p, pi) =>
        p.code !== undefined ? (
          <pre key={`c${pi}`} className={`rt-code lang-${normLang(p.lang)}`}>
            <code>{highlight(p.code, p.lang)}</code>
          </pre>
        ) : (
          <Blocks key={`t${pi}`} text={p.text!} prefix={`${pi}`} />
        ),
      )}
    </div>
  );
}

function Blocks({ text, prefix }: { text: string; prefix: string }) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <>
      {blocks.map((b0, bi0) => {
        const b = b0.replace(/^\n+|\n+$/g, "");
        const bi = `${prefix}-${bi0}`;
        if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(b)) return <hr key={bi} />;
        const all = b.split("\n");
        const isItem = (l: string) => /^\s*([-*•]|\d+[.)])\s+/.test(l);
        // «Заголовок:\n- пункт\n- пункт» — строка текста и список под ней
        const lead = all.findIndex(isItem);
        if (lead > 0 && all.slice(lead).every(isItem) && !/^#{1,3}\s/.test(all[0]!)) {
          const items = all.slice(lead);
          const ordered = /^\s*\d/.test(items[0]!);
          const lis = items.map((l, li) => <li key={li}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), `${bi}-l${li}`)}</li>);
          return (
            <Fragment key={bi}>
              <p>
                {all.slice(0, lead).map((l, li) => (
                  <Fragment key={li}>
                    {li > 0 && <br />}
                    {inline(l, `${bi}-p${li}`)}
                  </Fragment>
                ))}
              </p>
              {ordered ? <ol start={Number(/^\s*(\d+)/.exec(items[0]!)?.[1] ?? 1)}>{lis}</ol> : <ul>{lis}</ul>}
            </Fragment>
          );
        }
        const lines = all;
        if (lines.every(isItem)) {
          const ordered = /^\s*\d/.test(lines[0]!);
          const items = lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), `${bi}-${li}`)}</li>);
          return ordered ? (
            <ol key={bi} start={Number(/^\s*(\d+)/.exec(lines[0]!)?.[1] ?? 1)}>
              {items}
            </ol>
          ) : (
            <ul key={bi}>{items}</ul>
          );
        }
        if (/^#{1,3}\s/.test(lines[0]!)) {
          return (
            <h4 key={bi}>
              {inline(lines[0]!.replace(/^#+\s/, ""), `${bi}h`)}
              {lines.length > 1 && <span className="rt-sub">{inline(lines.slice(1).join(" "), `${bi}hs`)}</span>}
            </h4>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
