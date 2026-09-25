import { z } from "zod";
const text = (max = 200) => z.string().trim().min(1).max(max);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    "日期无效",
  );
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const datetime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  .refine((v) => date.safeParse(v.slice(0, 10)).success, "日期时间无效");
const optionalText = z.string().max(4000).optional();
const number = z.number().finite().min(0).max(1000000).optional();
export const profile = z
  .object({
    name: text(100),
    grade: z
      .string()
      .regex(/^\d{4}$/)
      .refine((v) => +v >= 1900 && +v <= new Date().getFullYear() + 1),
    major: text(200),
    gender: z.enum(["男", "女", "不愿透露"]),
  })
  .strict();
export const password = z.string().min(8).max(64);
export const login = z.object({ studentId: text(64), password }).strict();
export const register = profile.extend({ studentId: text(64), password });
const weeks = (s: string) =>
  s.split(/[,，]/).flatMap((p) => {
    const [a, b = a] = p.split("-").map(Number);
    return Array.from(
      { length: Math.max(0, Math.min(60, b - a + 1)) },
      (_, i) => a + i,
    );
  });
const record = z
  .object({
    id: text(100),
    kind: z.enum(["meal", "sleep", "exercise", "mood", "course", "task"]),
    date,
    title: text(),
    source: z.enum(["示例", "手动", "地图"]).optional(),
    start: time.optional(),
    end: time.optional(),
    place: optionalText,
    duration: number,
    note: optionalText,
    done: z.boolean().optional(),
    meal: z.enum(["早餐", "午餐", "晚餐"]).optional(),
    portion: optionalText,
    cost: number,
    kcal: number,
    protein: number,
    planned: z.boolean().optional(),
    sleepStart: datetime.optional(),
    sleepEnd: datetime.optional(),
    quality: z.number().int().min(1).max(5).optional(),
    distance: number,
    steps: number,
    mode: optionalText,
    mood: z.number().int().min(1).max(5).optional(),
    stress: z.number().int().min(1).max(5).optional(),
    weekday: z.number().int().min(1).max(7).optional(),
    weeks: z.string().max(200).optional(),
    teacher: optionalText,
  })
  .strict()
  .superRefine((r, ctx) => {
    const error = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (r.kind === "sleep") {
      const delta =
        Date.parse(r.sleepEnd ?? "") - Date.parse(r.sleepStart ?? "");
      if (!Number.isFinite(delta) || delta <= 0 || delta > 86400000)
        error("睡眠起止时间无效，单次须在24小时以内");
    }
    if (r.kind === "meal" && (!r.meal || !r.portion?.trim()))
      error("请选择餐次并填写份量");
    if (r.kind === "exercise" && !(r.duration! > 0)) error("运动时长须大于0");
    if (r.kind === "course") {
      if (
        !r.start ||
        !r.end ||
        r.start >= r.end ||
        !r.weekday ||
        !r.place?.trim()
      )
        error("课程时间、星期和地点不能为空或冲突");
      if (
        !r.weeks ||
        !/^\d+(?:-\d+)?(?:[,，]\d+(?:-\d+)?)*$/.test(r.weeks) ||
        r.weeks.split(/[,，]/).some((p) => {
          const [a, b = a] = p.split("-").map(Number);
          return a < 1 || b < a || b > 60;
        })
      )
        error("教学周无效");
    }
  });
export const data = z
  .object({
    records: z.array(record).max(10000),
    awards: z
      .array(
        z
          .object({
            lesson: text(100),
            score: z.number().min(0).max(100),
            date,
          })
          .strict(),
      )
      .max(1000),
    messages: z
      .array(
        z
          .object({
            id: text(100),
            role: z.enum(["user", "assistant"]),
            text: z.string().max(20000),
            link: z
              .string()
              .regex(/^\/(?!\/)[a-zA-Z0-9/?=&%_-]*$/)
              .max(500)
              .optional(),
            label: optionalText,
          })
          .strict(),
      )
      .max(5000),
    preferences: z
      .object({
        healthGoal: text(100),
        healthWeight: z.number().min(0).max(1),
        timeWeight: z.number().min(0).max(1),
        costWeight: z.number().min(0).max(1),
        modes: z
          .array(z.enum(["步行", "骑行", "跑步"]))
          .min(1)
          .max(3),
        taste: text(100),
        avoid: z.string().max(1000),
        budget: z.number().min(0).max(100000),
        lead: z.number().min(0).max(120),
        termStart: date,
        learningRate: z.number().positive().max(1),
        exploration: z.number().min(0).max(1),
        lstm: z.number().int().min(1).max(4096),
        dropout: z.number().min(0).max(1),
      })
      .strict(),
  })
  .strict()
  .superRefine((d, ctx) => {
    const error = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    for (const ids of [
      d.records.map((r) => r.id),
      d.messages.map((r) => r.id),
      d.awards.map((r) => r.lesson),
    ])
      if (new Set(ids).size !== ids.length) error("记录标识或测验成绩重复");
    if (
      Math.abs(
        d.preferences.healthWeight +
          d.preferences.timeWeight +
          d.preferences.costWeight -
          1,
      ) > 0.001
    )
      error("决策权重之和须为1");
    const courses = d.records.filter((r) => r.kind === "course");
    if (courses.length > 500) {
      error("课程条目不能超过500条");
      return;
    }
    for (let i = 0; i < courses.length; i++)
      for (let j = i + 1; j < courses.length; j++) {
        const a = courses[i],
          b = courses[j];
        if (
          a.weekday === b.weekday &&
          a.start! < b.end! &&
          a.end! > b.start! &&
          weeks(a.weeks ?? "").some((w) => weeks(b.weeks ?? "").includes(w))
        ) {
          error("课程时间冲突");
          return;
        }
      }
  });
export const state = z
  .object({ revision: z.number().int().nonnegative(), data })
  .strict();
export function emptyData() {
  return {
    records: [],
    awards: [],
    messages: [],
    preferences: {
      healthGoal: "保持健康",
      healthWeight: 0.4,
      timeWeight: 0.4,
      costWeight: 0.2,
      modes: ["步行"],
      taste: "不限",
      avoid: "",
      budget: 25,
      lead: 10,
      termStart: "2026-09-07",
      learningRate: 0.01,
      exploration: 0.1,
      lstm: 64,
      dropout: 0.2,
    },
  };
}
