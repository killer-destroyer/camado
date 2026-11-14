// Лёгкая подсветка кода (Python, Java, C++, HTML/CSS) — React-элементы, без вставки HTML.
import type { ReactNode } from "react";

const KW: Record<string, string> = {
  python:
    "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield print input len range int str float list dict set tuple bool sorted map",
  java: "abstract boolean break byte case catch char class continue default do double else enum extends final finally float for if implements import instanceof int interface long new null package private protected public record return short static super switch this throw throws true false try var void while String List Map Set System",
  cpp: "auto bool break case catch char class const continue default delete do double else enum false float for if include inline int long namespace new nullptr operator private protected public return short signed sizeof static struct switch template this throw true try typedef typename unsigned using vector virtual void while string cout cin endl std map set pair queue stack",
};

type Tok = { t: string; c?: string };

function tokenizeCode(code: string, lang: string): Tok[] {
  const kws = new Set((KW[lang] ?? KW.cpp!).split(" "));
  const comment = lang === "python" ? "#[^\\n]*" : "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/";
  const pre = lang === "cpp" ? "|#\\s*\\w+(?:\\s*<[^>\\n]*>)?" : "";
  const re = new RegExp(`(${comment}${pre})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*')|(\\b\\d[\\d_.]*[a-zA-Z]*\\b)|([A-Za-z_]\\w*)(\\s*\\()?`, "g");
  const out: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push({ t: code.slice(last, m.index) });
    if (m[1]) out.push({ t: m[1], c: m[1].startsWith("#") && lang === "cpp" ? "hl-pre" : "hl-com" });
    else if (m[2]) out.push({ t: m[2], c: "hl-str" });
    else if (m[3]) out.push({ t: m[3], c: "hl-num" });
    else if (m[4]) {
      out.push({ t: m[4], c: kws.has(m[4]) ? "hl-kw" : m[5] ? "hl-fn" : /^[A-Z]/.test(m[4]) ? "hl-type" : undefined });
      if (m[5]) out.push({ t: m[5] });
    }
    last = re.lastIndex;
  }
  if (last < code.length) out.push({ t: code.slice(last) });
  return out;
}

function tokenizeHtml(code: string): Tok[] {
  const out: Tok[] = [];
  const re = /(<!--[\s\S]*?-->)|(<\/?)([\w-]+)((?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)(\s*\/?>)|(\/\*[\s\S]*?\*\/)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(...cssish(code.slice(last, m.index)));
    if (m[1] || m[6]) out.push({ t: (m[1] ?? m[6])!, c: "hl-com" });
    else {
      out.push({ t: m[2]! }, { t: m[3]!, c: "hl-kw" });
      const attrs = m[4] ?? "";
      const ar = /([\w:-]+)(\s*=\s*)?("[^"]*"|'[^']*'|[^\s>]+)?/g;
      let al = 0;
      let am: RegExpExecArray | null;
      while ((am = ar.exec(attrs))) {
        if (am.index > al) out.push({ t: attrs.slice(al, am.index) });
        out.push({ t: am[1]!, c: "hl-fn" });
        if (am[2]) out.push({ t: am[2] });
        if (am[3]) out.push({ t: am[3], c: "hl-str" });
        al = ar.lastIndex;
      }
      if (al < attrs.length) out.push({ t: attrs.slice(al) });
      out.push({ t: m[5]! });
    }
    last = re.lastIndex;
  }
  if (last < code.length) out.push(...cssish(code.slice(last)));
  return out;
}

/** Внутри <style>: свойства и значения. В обычном тексте почти ничего не трогает. */
function cssish(text: string): Tok[] {
  const out: Tok[] = [];
  const re = /([\w-]+)(\s*:\s*)([^;{}\n]+)(?=;)|(#[0-9a-fA-F]{3,8}\b)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    if (m[4]) out.push({ t: m[4], c: "hl-num" });
    else out.push({ t: m[1]!, c: "hl-fn" }, { t: m[2]! }, { t: m[3]!, c: "hl-str" });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}

export function normLang(lang: string | undefined): string {
  const l = (lang ?? "").toLowerCase();
  if (l === "py" || l === "python") return "python";
  if (l === "java") return "java";
  if (l === "html" || l === "css" || l === "xml") return "html";
  if (l === "cpp" || l === "c++" || l === "c" || l === "h") return "cpp";
  return l || "cpp";
}

export function highlight(code: string, lang: string | undefined): ReactNode[] {
  const l = normLang(lang);
  const toks = l === "html" ? tokenizeHtml(code) : tokenizeCode(code, l);
  return toks.map((tk, i) => (tk.c ? <span key={i} className={tk.c}>{tk.t}</span> : tk.t));
}
