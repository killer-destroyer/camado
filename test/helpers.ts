import { openDb } from "../src/db.js";
import { Store } from "../src/store.js";

export function memoryStore(now: () => Date = () => new Date("2026-11-05T15:00:00Z")): Store {
  return new Store(openDb(":memory:"), now);
}
