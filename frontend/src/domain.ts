import type { LifeRecord, Menu, Meal, UserData } from "./types";
import { seedData, today, dateISO } from "./seed";
export const uid = () => crypto.randomUUID();
export const minutes = (time = "00:00") => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export const clock = (n: number) => {
  const value = ((Math.round(n) % 1440) + 1440) % 1440;
  return (
    String(Math.floor(value / 60)).padStart(2, "0") +
    ":" +
    String(value % 60).padStart(2, "0")
  );
};
export const sleepHours = (a: string, b: string) =>
  Math.round((+new Date(b) - +new Date(a)) / 360000) / 10;
export function mealTotals(records: LifeRecord[]) {
  const meals = records.filter((r) => r.kind === "meal" && !r.planned);
  const known = meals.filter((r) => r.kcal != null);
  return {
    count: meals.length,
    known: known.length,
    kcal: known.length ? known.reduce((s, r) => s + r.kcal!, 0) : null,
    cost: meals.reduce((s, r) => s + (r.cost ?? 0), 0),
  };
}
export function filterMeals(
  items: Menu[],
  q: {
    meal: Meal;
    budget: number;
    taste: string;
    avoid: string;
    minutes?: number;
  },
) {
  const avoids = q.avoid.split(/[,，、\s]+/).filter(Boolean);
  return items.filter(
    (m) =>
      m.meal === q.meal &&
      m.cost <= q.budget &&
      (q.taste === "不限" || m.taste === q.taste) &&
      m.minutes <= (q.minutes ?? 120) &&
      !avoids.some((a) => (m.food + m.ingredients).includes(a)),
  );
}
export function weeksList(value = "1-20"): number[] {
  return [
    ...new Set(
      value.split(/[,，]/).flatMap((v) => {
        const [a, b] = v.trim().split("-").map(Number);
        return b
          ? Array.from(
              { length: Math.max(0, Math.min(60, b - a + 1)) },
              (_, i) => a + i,
            )
          : [a];
      }),
    ),
  ].filter((v) => v > 0 && v <= 60);
}
export function courseOnDate(r: LifeRecord, date: string, termStart: string) {
  const d = new Date(date + "T12:00");
  const week =
    Math.floor((+d - +new Date(termStart + "T12:00")) / 604800000) + 1;
  return (
    r.kind === "course" &&
    r.weekday === (d.getDay() || 7) &&
    weeksList(r.weeks).includes(week)
  );
}
export function validateRecord(
  r: LifeRecord,
  records: LifeRecord[],
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!r.title.trim()) e.title = "请填写名称";
  if (!r.date) e.date = "请选择日期";
  if (r.kind === "course") {
    if (!r.start) e.start = "请选择开始时间";
    if (!r.end || minutes(r.end) <= minutes(r.start))
      e.end = "结束时间须晚于开始时间";
    if (!r.place?.trim()) e.place = "请填写上课地点";
    if (!r.weekday) e.weekday = "请选择星期";
    if (
      !r.weeks ||
      !/^\d+(?:-\d+)?(?:[,，]\d+(?:-\d+)?)*$/.test(r.weeks) ||
      !weeksList(r.weeks).length ||
      r.weeks.split(/[,，]/).some((w) => {
        const [a, b] = w.split("-").map(Number);
        return a < 1 || a > 60 || (b !== undefined && (b < a || b > 60));
      })
    )
      e.weeks = "请填写有效教学周，例如 1-18 或 1,3,5";
    if (
      records.some(
        (x) =>
          x.id !== r.id &&
          x.kind === "course" &&
          x.weekday === r.weekday &&
          weeksList(x.weeks).some((w) => weeksList(r.weeks).includes(w)) &&
          minutes(r.start) < minutes(x.end) &&
          minutes(r.end) > minutes(x.start),
      )
    )
      e.start = "与已有课程时间冲突，请调整";
  }
  if (r.kind === "sleep") {
    if (!r.sleepStart) e.sleepStart = "请选择入睡时间";
    if (
      !r.sleepEnd ||
      !Number.isFinite(sleepHours(r.sleepStart ?? "", r.sleepEnd)) ||
      sleepHours(r.sleepStart ?? "", r.sleepEnd) <= 0
    )
      e.sleepEnd = "起床时间须晚于入睡时间";
    else if (sleepHours(r.sleepStart!, r.sleepEnd) > 24)
      e.sleepEnd = "请检查日期，单次睡眠不能超过 24 小时";
  }
  if (r.kind === "exercise" && !(Number(r.duration) > 0))
    e.duration = "运动时长须大于 0";
  if (r.kind === "meal" && !r.portion?.trim()) e.portion = "请填写份量";
  for (const k of [
    "cost",
    "kcal",
    "protein",
    "duration",
    "distance",
    "steps",
  ] as const)
    if (r[k] != null && (!Number.isFinite(r[k]) || r[k]! < 0))
      e[k] = "请输入不小于 0 的数字";
  return e;
}
export function awardLesson(
  data: UserData,
  lesson: string,
  score: number,
): UserData {
  return data.awards.some((a) => a.lesson === lesson)
    ? data
    : { ...data, awards: [...data.awards, { lesson, score, date: dateISO() }] };
}
export function makeStore(storage: Pick<Storage, "getItem" | "setItem">) {
  return {
    read(id: string): UserData {
      const raw = storage.getItem("zhixing:data:" + id);
      if (raw) {
        try {
          const x = JSON.parse(raw);
          if (
            Array.isArray(x.records) &&
            Array.isArray(x.awards) &&
            Array.isArray(x.messages) &&
            x.preferences
          )
            return x;
        } catch {
          /* retain damaged value until a deliberate save */
        }
      }
      return seedData(id);
    },
    write(id: string, data: UserData) {
      storage.setItem("zhixing:data:" + id, JSON.stringify(data));
    },
  };
}
export function exportCsv(records: LifeRecord[]) {
  const cell = (s: unknown) =>
    '"' +
    String(s ?? "")
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return (
    "\uFEFF" +
    [
      [
        "名称",
        "类型",
        "日期",
        "状态",
        "地点",
        "花费",
        "热量",
        "备注",
        "来源",
        "开始时间",
        "结束时间",
        "时长分钟",
        "餐次",
        "份量",
        "蛋白质g",
        "入睡时间",
        "起床时间",
        "睡眠质量",
        "运动方式",
        "距离km",
        "步数",
        "心情",
        "压力",
        "星期",
        "教学周",
        "教师",
      ],
      ...records.map((r) => [
        r.title,
        r.kind,
        r.date,
        r.planned ? "计划" : r.done ? "已完成" : "记录",
        r.place,
        r.cost,
        r.kcal,
        r.note,
        r.source,
        r.start,
        r.end,
        r.duration,
        r.meal,
        r.portion,
        r.protein,
        r.sleepStart,
        r.sleepEnd,
        r.quality,
        r.mode,
        r.distance,
        r.steps,
        r.mood,
        r.stress,
        r.weekday,
        r.weeks,
        r.teacher,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function courseForDestination(
  records: LifeRecord[],
  place: string,
  date: string,
  termStart: string,
  departure: string,
) {
  return records
    .filter(
      (r) =>
        courseOnDate(r, date, termStart) &&
        r.place &&
        place.includes(r.place) &&
        (r.start ?? "") >= departure,
    )
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""))[0];
}
