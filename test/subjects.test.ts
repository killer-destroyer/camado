import { describe, expect, it } from "vitest";
import { openDb } from "../src/db.js";
import { Store } from "../src/store.js";
import { findSimilarSubject, sameSubject } from "../src/subjects.js";

describe("похожие предметы", () => {
  it.each([
    ["Алгоритмы и структура данных", "Алгоритмы и структуры данных"],
    ["прога", "Программирование"],
    ["прога", "Введение в программирование"],
    ["матан", "Математический анализ"],
    ["Линал", "Линейная алгебра"],
    ["АСД", "Алгоритмы и структуры данных"],
    ["Дискретка", "Дискретная математика"],
    ["Математический анализ", "Математический  анализ "],
  ])("«%s» = «%s»", (a, b) => expect(sameSubject(a, b)).toBe(true));

  it.each([
    ["Математический анализ 1", "Математический анализ 2"],
    ["Линейная алгебра", "Математический анализ"],
    ["Физика", "Философия"],
    ["Программирование на Java", "Программирование на Python"],
    ["Теория вероятностей", "Теория игр"],
  ])("«%s» ≠ «%s»", (a, b) => expect(sameSubject(a, b)).toBe(false));

  it("находит уже заведённый", () => {
    expect(findSimilarSubject("прога", ["Матан", "Введение в программирование"])).toBe("Введение в программирование");
    expect(findSimilarSubject("Физика", ["Матан"])).toBeUndefined();
  });
});

describe("Store: дубли предметов", () => {
  it("не заводит второй похожий предмет и подставляет его в задания", () => {
    const store = new Store(openDb(":memory:"));
    store.saveSubject({ name: "Введение в программирование", teacher: "Иванов" });
    const s = store.saveSubject({ name: "прога", info: "сдавать в гитхаб" });
    expect(s.name).toBe("Введение в программирование");
    expect(store.listSubjects()).toHaveLength(1);
    expect(store.addTask({ title: "лаба 1", subject: "прога" }).subject).toBe("Введение в программирование");
  });

  it("объединяет дубли: задания и заметки переезжают, лишняя карточка удаляется", () => {
    const store = new Store(openDb(":memory:"));
    store.saveSubject({ name: "Алгоритмы и структуры данных", teacher: "Петров" }, { exact: true });
    store.saveSubject({ name: "Алгоритмы и структура данных", info: "контест на codeforces" }, { exact: true });
    expect(store.listSubjects()).toHaveLength(2);
    store.addTask({ title: "дз 3", subject: "Алгоритмы и структура данных" });
    store.saveNote({ title: "кучи", subject: "Алгоритмы и структура данных" });
    const r = store.mergeSubjects(["Алгоритмы и структура данных"], "Алгоритмы и структуры данных");
    expect(r.removed).toEqual(["Алгоритмы и структура данных"]);
    const subs = store.listSubjects();
    expect(subs).toHaveLength(1);
    expect(subs[0]!.info).toContain("codeforces");
    expect(store.listTasks()[0]!.subject).toBe("Алгоритмы и структуры данных");
    expect(store.listNotes()[0]!.subject).toBe("Алгоритмы и структуры данных");
  });

  it("удаляет карточку предмета", () => {
    const store = new Store(openDb(":memory:"));
    store.saveSubject({ name: "Физра" });
    expect(store.deleteSubject("физра")).toBe(true);
    expect(store.listSubjects()).toHaveLength(0);
  });
});
