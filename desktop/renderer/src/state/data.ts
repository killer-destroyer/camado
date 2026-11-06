import type { LessonLink, Note, Subject, Task, TaskStep } from "../../../shared/types";
import { api } from "../lib/api";
import { createStore } from "../lib/store";

interface DataState {
  tasks: Task[];
  subjects: Subject[];
  notes: Note[];
  links: LessonLink[];
  steps: TaskStep[];
  loaded: boolean;
}

export const data = createStore<DataState>({ tasks: [], subjects: [], notes: [], links: [], steps: [], loaded: false });

export async function refreshData(): Promise<void> {
  const [tasks, subjects, notes, links, steps] = await Promise.all([api.tasks.list(), api.subjects.list(), api.notes.list(), api.links.list(), api.steps.list()]);
  data.set({ tasks, subjects, notes, links, steps, loaded: true });
}

/** Подписка на изменения из бота, ИИ и напоминаний. */
export function watchData(): () => void {
  const off = api.on("data-changed", () => void refreshData());
  const timer = window.setInterval(() => void refreshData(), 60_000);
  return () => {
    off();
    clearInterval(timer);
  };
}
