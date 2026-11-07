// «Библиотека»: книги и источники владельца.
import type { Book, BookSource } from "../../../shared/types";
import { api } from "../lib/api";
import { createStore } from "../lib/store";

export const books = createStore<{ list: Book[]; sources: BookSource[]; loaded: boolean; reading?: Book }>({ list: [], sources: [], loaded: false });

let watching = false;
export async function loadBooks(): Promise<void> {
  const r = await api.books.list();
  books.set({ list: r.books, sources: r.sources, loaded: true });
  if (!watching) {
    watching = true;
    api.on("books-changed", () => void loadBooks());
  }
}

/** Ссылка на поиск темы в источнике. */
export const sourceUrl = (s: BookSource, q: string) => s.url.replace("{q}", encodeURIComponent(q));

export const bookFileUrl = (b: Book) => (b.file ? `camado-media://book/${b.file}` : undefined);

export const STATUS_LABEL: Record<Book["status"], string> = { want: "хочу прочитать", reading: "читаю", done: "прочитал" };
