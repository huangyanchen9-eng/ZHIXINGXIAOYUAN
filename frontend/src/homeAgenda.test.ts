import { describe, it, expect } from "vitest";
import { nextAgendaItem } from "./homeAgenda";
import type { LifeRecord } from "./types";
describe("homepage next agenda", () => {
  const task: LifeRecord = {
    id: "t",
    kind: "task",
    date: "2026-09-26",
    title: "读书",
    start: "14:00",
    end: "10:05",
    duration: 30,
  };
  it("ignores hidden legacy end on tasks and uses duration", () => {
    expect(nextAgendaItem([task], new Date(2026, 8, 26, 13))).toBe(task);
    expect(nextAgendaItem([task], new Date(2026, 8, 26, 14, 15))).toBe(task);
    expect(
      nextAgendaItem([task], new Date(2026, 8, 26, 14, 30)),
    ).toBeUndefined();
  });
  it("excludes completed items, supports meals and sorts by time", () => {
    const meal: LifeRecord = {
      ...task,
      id: "m",
      kind: "meal",
      planned: true,
      start: "12:00",
      duration: 20,
    };
    expect(nextAgendaItem([task, meal], new Date(2026, 8, 26, 11))).toBe(meal);
    expect(
      nextAgendaItem([{ ...task, done: true }], new Date(2026, 8, 26, 13)),
    ).toBeUndefined();
  });
  it("course end controls expiry, dates of recurring courses do not", () => {
    const course: LifeRecord = {
      ...task,
      kind: "course",
      date: "2026-09-01",
      start: "09:00",
      end: "10:05",
    };
    expect(nextAgendaItem([course], new Date(2026, 8, 26, 10))).toBe(course);
    expect(
      nextAgendaItem([course], new Date(2026, 8, 26, 10, 5)),
    ).toBeUndefined();
  });
});
