// Читалка PDF прямо в Камадо: страницы рисуются по мере прокрутки, можно выделять текст,
// Камадо помнит, где остановился, и открывает на этом месте.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircleQuestion, Minus, Plus, X } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { Book } from "../../../shared/types";
import { api } from "../lib/api";
import { bookFileUrl } from "../state/books";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export function PdfReader({ book, onClose, onAsk }: { book: Book; onClose: () => void; onAsk?: (ctx: { book: Book; page: number; selection: string }) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [ratio, setRatio] = useState(1.414);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(book.page ?? 1);
  const [error, setError] = useState("");
  const rendered = useRef(new Map<number, number>()); // страница → при каком размере нарисована
  const pageRef = useRef(page);
  pageRef.current = page;

  useEffect(() => {
    const url = bookFileUrl(book);
    if (!url) return;
    const task = pdfjs.getDocument({ url, isEvalSupported: false });
    let alive = true;
    task.promise
      .then(async (d) => {
        if (!alive) return;
        const p1 = await d.getPage(1);
        const vp = p1.getViewport({ scale: 1 });
        setRatio(vp.height / vp.width);
        setDoc(d);
        if (book.pages !== d.numPages) void api.books.save({ ...book, pages: d.numPages, status: book.status === "want" ? "reading" : book.status });
      })
      .catch(() => alive && setError("Не получилось открыть PDF — файл повреждён или это не PDF."));
    return () => {
      alive = false;
      void task.destroy();
    };
  }, [book.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Открыть там, где остановился
  useEffect(() => {
    if (!doc) return;
    requestAnimationFrame(() => box.current?.querySelector(`[data-page="${book.page ?? 1}"]`)?.scrollIntoView({ block: "start" }));
  }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps

  // Рисовать видимые страницы, следить за текущей
  useEffect(() => {
    if (!doc || !box.current) return;
    const root = box.current;
    rendered.current.clear();
    const draw = async (el: HTMLElement) => {
      const n = Number(el.dataset.page);
      const width = el.clientWidth;
      if (rendered.current.get(n) === width) return;
      rendered.current.set(n, width);
      const p = await doc.getPage(n);
      const base = p.getViewport({ scale: 1 });
      const scale = width / base.width;
      const vp = p.getViewport({ scale });
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(vp.width * dpr);
      canvas.height = Math.floor(vp.height * dpr);
      canvas.style.width = `${vp.width}px`;
      canvas.style.height = `${vp.height}px`;
      const ctx = canvas.getContext("2d")!;
      await p.render({ canvas, canvasContext: ctx, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined }).promise;
      const text = document.createElement("div");
      text.className = "textLayer";
      text.style.setProperty("--scale-factor", String(scale));
      el.replaceChildren(canvas, text);
      try {
        await new pdfjs.TextLayer({ textContentSource: p.streamTextContent(), container: text, viewport: vp }).render();
      } catch {
        /* без текста — только картинка */
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) void draw(e.target as HTMLElement);
      },
      { root, rootMargin: "800px 0px" },
    );
    const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-page]"));
    pages.forEach((p) => io.observe(p));
    const onScroll = () => {
      const mid = root.scrollTop + root.clientHeight / 3;
      let cur = 1;
      for (const p of pages) if (p.offsetTop <= mid) cur = Number(p.dataset.page);
      if (cur !== pageRef.current) setPage(cur);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      root.removeEventListener("scroll", onScroll);
    };
  }, [doc, zoom]);

  // Запомнить страницу
  useEffect(() => {
    if (!doc) return;
    const t = window.setTimeout(() => {
      void api.books.save({ ...book, page, pages: doc.numPages, status: book.status === "done" ? "done" : page >= doc.numPages ? "done" : "reading" });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [page, doc]); // eslint-disable-line react-hooks/exhaustive-deps

  const goto = (n: number) => {
    if (!doc) return;
    const p = Math.max(1, Math.min(doc.numPages, n));
    box.current?.querySelector(`[data-page="${p}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      else if (e.key === "ArrowRight" || e.key === "PageDown") goto(pageRef.current + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") goto(pageRef.current - 1);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  return (
    <div className="pdf-back">
      <div className="pdf-bar glass">
        <b className="pdf-title" title={book.title}>
          {book.title}
        </b>
        <button className="icon-btn" title="Назад" onClick={() => goto(page - 1)}>
          <ChevronLeft size={18} />
        </button>
        <span className="pdf-page">
          <input className="input sm" value={page} onChange={(e) => Number(e.target.value) && goto(Number(e.target.value))} /> / {doc?.numPages ?? "…"}
        </span>
        <button className="icon-btn" title="Вперёд" onClick={() => goto(page + 1)}>
          <ChevronRight size={18} />
        </button>
        <button className="icon-btn" title="Мельче" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}>
          <Minus size={16} />
        </button>
        <span className="muted small">{Math.round(zoom * 100)}%</span>
        <button className="icon-btn" title="Крупнее" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}>
          <Plus size={16} />
        </button>
        {onAsk && (
          <button className="btn sm" title="Выдели текст и спроси ИИ — или спроси про эту страницу" onClick={() => onAsk({ book, page, selection: String(window.getSelection() ?? "").trim().slice(0, 3000) })}>
            <MessageCircleQuestion size={15} /> Спросить ИИ
          </button>
        )}
        <button className="icon-btn" title="Закрыть (Esc)" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div ref={box} className="pdf-pages">
        {error && <div className="pdf-error">{error}</div>}
        {doc &&
          Array.from({ length: doc.numPages }, (_, i) => (
            <div key={`${i + 1}:${zoom}`} className="pdf-page-box" data-page={i + 1} style={{ width: `min(${Math.round(900 * zoom)}px, ${Math.round(94 * zoom)}%)`, aspectRatio: `1 / ${ratio}` }} />
          ))}
      </div>
    </div>
  );
}
