import { describe, expect, it } from "vitest";
import { buildTools } from "../src/camado/tools.js";
import { memoryStore } from "./helpers.js";

function setup() {
  const store = memoryStore();
  const tools = new Map(buildTools(store, "America/New_York").map((t) => [t.name, t]));
  const call = (name: string, input: unknown) => tools.get(name)!.run(input);
  return { store, tools, call };
}

describe("инструменты Камадо", () => {
  it("у всех инструментов объектная JSON Schema без служебного $schema", () => {
    const { tools } = setup();
    for (const t of tools.values()) {
      expect(t.inputSchema.type).toBe("object");
      expect(t.inputSchema).not.toHaveProperty("$schema");
    }
  });

  it("add_task сохраняет срок в UTC", async () => {
    const { store, call } = setup();
    const out = await call("add_task", {
      title: "Решить №5–12",
      subject: "Матан",
      due_at: "2026-11-06T23:59:00-05:00",
    });
    expect(out).toContain("Сохранено: #1");
    expect(store.getTask(1)!.dueAt).toBe("2026-11-07T04:59:00.000Z");
  });

  it("add_task отклоняет дату без пояса и мусор", async () => {
    const { call } = setup();
    await expect(call("add_task", { title: "x", due_at: "2026-11-06T23:59:00" })).rejects.toThrow(/смещением/);
    await expect(call("add_task", { title: "x", due_at: "в пятницу" })).rejects.toThrow();
    await expect(call("add_task", { title: "" })).rejects.toThrow();
  });

  it("update_task меняет статус, а на несуществующее задание — ошибка", async () => {
    const { store, call } = setup();
    store.addTask({ title: "лаба" });
    expect(await call("update_task", { id: 1, status: "done" })).toContain("сдано");
    expect(store.getTask(1)).toMatchObject({ title: "лаба", status: "done" });
    await expect(call("update_task", { id: 99, status: "done" })).rejects.toThrow(/#99/);
  });

  it("предметы и память", async () => {
    const { store, call } = setup();
    await call("save_subject", { name: "Физика", teacher: "Иванов", info: "Moodle, PDF" });
    expect(await call("list_subjects", {})).toContain("Физика (Иванов)");
    await call("remember", { fact: "Учится на 2 курсе" });
    expect(store.listMemory()).toHaveLength(1);
    expect(await call("forget", { id: 1 })).toBe("Забыл.");
  });
});
