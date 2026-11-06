// Текст с формулами и простым оформлением: $формула$, $$формула по центру$$, **жирный**, списки, абзацы.
// HTML из текста не вставляется: формулы рисует KaTeX (он экранирует всё сам), остальное — React-элементы.
import katex from "katex";
import "katex/dist/katex.min.css";
import { Fragment, type ReactNode } from "react";

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
  const re = /\$\$([^$]+)\$\$|\$([^$\n]+)\$|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={`${keyBase}t${i}`}>{text.slice(last, m.index)}</Fragment>);
    if (m[1] !== undefined) out.push(formula(m[1], true, `${keyBase}m${i}`));
    else if (m[2] !== undefined) out.push(formula(m[2], false, `${keyBase}m${i}`));
    else if (m[3] !== undefined) out.push(<b key={`${keyBase}b${i}`}>{m[3]}</b>);
    else if (m[4] !== undefined) out.push(<code key={`${keyBase}c${i}`}>{m[4]}</code>);
    last = re.lastIndex;
    i++;
  }
  if (last < text.length) out.push(<Fragment key={`${keyBase}e`}>{text.slice(last)}</Fragment>);
  return out;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className={`rich ${className ?? ""}`}>
      {blocks.map((b, bi) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]!);
          const items = lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), `${bi}-${li}`)}</li>);
          return ordered ? <ol key={bi}>{items}</ol> : <ul key={bi}>{items}</ul>;
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
    </div>
  );
}
