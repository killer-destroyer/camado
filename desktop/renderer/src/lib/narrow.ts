// Узкий экран (телефон или очень узкое окно): другая раскладка — нижняя панель вместо боковой и т. п.
import { useSyncExternalStore } from "react";

export const NARROW = "(max-width: 720px)";
const mq = typeof window !== "undefined" ? window.matchMedia(NARROW) : undefined;

export const isNarrow = (): boolean => !!mq?.matches;

export function useNarrow(): boolean {
  return useSyncExternalStore(
    (cb) => {
      mq?.addEventListener("change", cb);
      return () => mq?.removeEventListener("change", cb);
    },
    isNarrow,
  );
}
