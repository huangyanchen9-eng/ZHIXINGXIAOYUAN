import { describe, it, expect } from "vitest";
import {
  sleepHours,
  mealTotals,
  validateRecord,
  awardLesson,
  filterMeals,
  courseOnDate,
  makeStore,
  exportCsv,
  clock,
  courseForDestination,
} from "./domain";
import { seedData, menus } from "./seed";
describe("生活数据与边界", () => {
  it("跨日时刻规范化，不产生负小时或 60 分钟", () => {
    expect(clock(-10)).toBe("23:50");
    expect(clock(1439.7)).toBe("00:00");
    expect(clock(1500)).toBe("01:00");
  });
  it("路线提醒只匹配当天有效且尚未开始的课程", () => {
    const a = {
      id: "x",
      kind: "course" as const,
      date: "2026-09-25",
      title: "课程",
      place: "学汇楼",
      start: "08:00",
      end: "09:00",
      weekday: 5,
      weeks: "1-18",
    };
    expect(
      courseForDestination([a], "学汇楼", "2026-09-25", "2026-09-07", "10:00"),
    ).toBeUndefined();
    expect(
      courseForDestination(
        [{ ...a, start: "12:00" }],
        "学汇楼",
        "2026-09-25",
        "2026-09-07",
        "10:00",
      )?.id,
    ).toBe("x");
  });
  it("跨午夜睡眠正确计算", () =>
    expect(sleepHours("2026-09-24T23:00", "2026-09-25T07:30")).toBe(8.5));
  it("用餐计划不计入摄入，未知营养不当作零", () => {
    const data = seedData("a");
    data.records = [
      {
        id: "a",
        kind: "meal",
        date: "2026-09-25",
        title: "午餐",
        meal: "午餐",
        planned: true,
        kcal: 600,
      },
      {
        id: "b",
        kind: "meal",
        date: "2026-09-25",
        title: "晚餐",
        meal: "晚餐",
      },
    ];
    expect(mealTotals(data.records)).toEqual({
      count: 1,
      known: 0,
      kcal: null,
      cost: 0,
    });
  });
  it("拒绝时间倒置与课程重叠", () => {
    const r = {
      id: "1",
      kind: "course" as const,
      date: "2026-09-25",
      title: "课程",
      weekday: 5,
      start: "08:00",
      end: "10:00",
      weeks: "1-18",
      place: "学汇楼",
    };
    expect(
      validateRecord({ ...r, id: "2", start: "09:00" }, [r]).start,
    ).toBeTruthy();
    expect(validateRecord({ ...r, start: "12:00" }, []).end).toBeTruthy();
  });
  it("教学周与星期均匹配才显示", () => {
    const r = {
      id: "1",
      kind: "course" as const,
      date: "2026-09-25",
      title: "课程",
      weekday: 5,
      weeks: "1-2",
    };
    expect(courseOnDate(r, "2026-09-25", "2026-09-07")).toBe(false);
  });
  it("同一微课只奖励一次", () => {
    const d = seedData("a");
    const once = awardLesson(d, "green", 20);
    expect(awardLesson(once, "green", 20).awards.length).toBe(
      once.awards.length,
    );
  });
  it("餐次预算口味与忌口同时生效", () => {
    expect(
      filterMeals(menus, { meal: "午餐", budget: 0, taste: "不限", avoid: "" }),
    ).toHaveLength(0);
    expect(
      filterMeals(menus, {
        meal: "晚餐",
        budget: 100,
        taste: "清淡",
        avoid: "蛋",
      }).every(
        (m) =>
          m.meal === "晚餐" && m.taste === "清淡" && !m.food.includes("蛋"),
      ),
    ).toBe(true);
  });
  it("用户数据隔离与刷新恢复", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
    };
    const a = makeStore(storage);
    const x = a.read("one");
    x.records = [];
    a.write("one", x);
    expect(makeStore(storage).read("one").records).toHaveLength(0);
    expect(a.read("two").records.length).toBeGreaterThan(0);
  });
  it("CSV 防止公式注入并正确转义", () =>
    expect(
      exportCsv([{ id: "x", kind: "task", date: "2026-09-25", title: "=1+1" }]),
    ).toContain("'=1+1"));
});
