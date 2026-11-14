// 1.8.1: «назад» и «вперёд» помнят, что играло, — и вперемешку тоже.
import { describe, expect, it } from "vitest";
import { ahead, behind, pushBefore, pushNext, startTrail, stepBack, stepForward } from "../desktop/shared/trail.js";

describe("память плеера", () => {
  it("назад, назад, вперёд, вперёд — те же песни в том же порядке", () => {
    let t = startTrail("A");
    t = pushNext(t, "B");
    t = pushNext(t, "C");
    expect(behind(t)).toBe("B");
    t = stepBack(t);
    expect(behind(t)).toBe("A");
    t = stepBack(t);
    expect(behind(t)).toBeUndefined();
    expect(ahead(t)).toBe("B");
    t = stepForward(t);
    expect(ahead(t)).toBe("C");
    t = stepForward(t);
    expect(ahead(t)).toBeUndefined(); // дальше — новая песня
  });

  it("вернулся назад и выбрал новую — старое «впереди» забывается, «назад» помнит", () => {
    let t = pushNext(pushNext(startTrail("A"), "B"), "C");
    t = stepBack(stepBack(t)); // на A
    t = pushNext(t, "X");
    expect(t.ids).toEqual(["A", "X"]);
    expect(behind(t)).toBe("A");
    expect(ahead(t)).toBeUndefined();
  });

  it("назад с самой первой (по порядку) — песня перед ней, а текущая становится «впереди»", () => {
    let t = startTrail("B");
    t = pushBefore(t, "A");
    expect(t).toEqual({ ids: ["A", "B"], pos: 0 });
    expect(ahead(t)).toBe("B");
  });

  it("длинная история не растёт бесконечно", () => {
    let t = startTrail("0");
    for (let i = 1; i < 1000; i++) t = pushNext(t, String(i));
    expect(t.ids.length).toBe(300);
    expect(t.ids[t.pos]).toBe("999");
    expect(behind(t)).toBe("998");
  });
});
