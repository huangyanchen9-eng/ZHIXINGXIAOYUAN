import { isDemo } from "./services";
import { useState } from "react";
import {
  ForkKnife,
  Moon,
  PersonSimpleRun,
  Smiley,
  CalendarBlank,
  CheckSquare,
} from "@phosphor-icons/react";
import { useApp } from "./store";
import { Modal, Field } from "./ui";
import { kindLabels, type Kind, type LifeRecord } from "./types";
import { today } from "./seed";
import { uid, validateRecord } from "./domain";
import s from "./App.module.css";
const kinds: Kind[] = ["meal", "sleep", "exercise", "mood", "course", "task"];
const icons = [
  ForkKnife,
  Moon,
  PersonSimpleRun,
  Smiley,
  CalendarBlank,
  CheckSquare,
];
export function RecordPicker({ close }: { close: () => void }) {
  const { edit } = useApp();
  return (
    <Modal title="记录一下，今天的生活" onClose={close}>
      <p className={s.muted}>每一份记录，都让明天的建议更懂你。</p>
      <div className={s.picker}>
        {kinds.map((k, i) => {
          const Icon = icons[i];
          return (
            <button
              key={k}
              onClick={() => {
                close();
                edit(k);
              }}
            >
              <Icon size={30} weight="duotone" />
              <strong>{kindLabels[k]}</strong>
              <small>
                {
                  [
                    "吃得怎么样",
                    "昨晚睡得好吗",
                    "动起来的时刻",
                    "听听内心的声音",
                    "安排下一节课",
                    "记住一件小事",
                  ][i]
                }
              </small>
            </button>
          );
        })}
      </div>
      <p className={s.note}>
        {isDemo()
          ? "演示记录保存在当前浏览器。"
          : "记录按当前账号保存到后端数据库。"}
      </p>
    </Modal>
  );
}
export function RecordEditor() {
  const { editor, edit, data, saveRecord } = useApp();
  if (!editor) return null;
  return (
    <Editor
      key={typeof editor === "string" ? editor : editor.id}
      initial={editor}
      records={data!.records}
      close={() => edit(null)}
      save={saveRecord}
    />
  );
}
function Editor({
  initial,
  records,
  close,
  save,
}: {
  initial: LifeRecord | Kind;
  records: LifeRecord[];
  close: () => void;
  save: (r: LifeRecord) => Promise<void>;
}) {
  const kind = typeof initial === "string" ? initial : initial.kind;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const [r, setR] = useState<LifeRecord>(
    typeof initial === "string"
      ? {
          id: uid(),
          kind,
          date: today,
          title:
            kind === "sleep" ? "昨夜睡眠" : kind === "mood" ? "今天的心情" : "",
          source: "手动",
          meal: "早餐",
          portion: "1 份",
          planned: false,
          quality: 4,
          mood: 4,
          stress: 2,
          weekday: new Date().getDay() || 7,
          weeks: "1-18",
          start: "08:30",
          end: "10:05",
          duration: 30,
          mode: "步行",
        }
      : { ...initial },
  );
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false);
  const text = (
    key: keyof LifeRecord,
    label: string,
    type = "text",
    hint?: string,
  ) => (
    <Field label={label} error={errors[key]} hint={hint}>
      <input
        type={type}
        value={String(r[key] ?? "")}
        onChange={(e) => setR({ ...r, [key]: e.target.value })}
      />
    </Field>
  );
  const num = (key: keyof LifeRecord, label: string, max?: number) => (
    <Field label={label} error={errors[key]}>
      <input
        type="number"
        min="0"
        max={max}
        step="any"
        value={(r[key] as number) ?? ""}
        onChange={(e) =>
          setR({
            ...r,
            [key]: e.target.value === "" ? undefined : Number(e.target.value),
          })
        }
      />
    </Field>
  );
  const select = (key: keyof LifeRecord, label: string, options: string[]) => (
    <Field label={label}>
      <select
        value={String(r[key] ?? options[0])}
        onChange={(e) => setR({ ...r, [key]: e.target.value })}
      >
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </Field>
  );
  return (
    <Modal
      title={`${typeof initial === "string" ? "新增" : "编辑"}${kindLabels[kind]}记录`}
      onClose={close}
    >
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const err = validateRecord(r, records);
          setErrors(err);
          if (Object.keys(err).length) return;
          setBusy(true);
          try {
            await save({
              ...r,
              title: r.title.trim(),
              date: r.kind === "sleep" ? r.sleepEnd!.slice(0, 10) : r.date,
            });
          } catch {
            setBusy(false);
          }
        }}
      >
        <div className={s.formGrid}>
          {text("title", kind === "meal" ? "吃了什么" : "名称")}
          {text("date", "记录日期", "date")}
          {kind === "meal" && (
            <>
              {select("meal", "餐次", ["早餐", "午餐", "晚餐"])}
              {text("portion", "份量")}
              {text("place", "就餐地点")}
              {num("cost", "花费（元）")}
              {num("kcal", "热量（kcal，可不填）")}
              {num("protein", "蛋白质（g，可不填）")}
              <Field label="记录状态">
                <select
                  value={r.planned ? "plan" : "eaten"}
                  onChange={(e) =>
                    setR({ ...r, planned: e.target.value === "plan" })
                  }
                >
                  <option value="eaten">已经吃了</option>
                  <option value="plan">计划吃，还未摄入</option>
                </select>
              </Field>
              {text("start", "就餐时间", "time")}
            </>
          )}
          {kind === "sleep" && (
            <>
              {text("sleepStart", "入睡时间", "datetime-local")}
              {text("sleepEnd", "起床时间", "datetime-local")}
              <Field label="睡眠质量">
                <select
                  value={r.quality}
                  onChange={(e) => setR({ ...r, quality: +e.target.value })}
                >
                  {["很差", "较差", "一般", "不错", "很好"].map((v, i) => (
                    <option key={v} value={i + 1}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {kind === "exercise" && (
            <>
              {select("mode", "运动类型", [
                "步行",
                "跑步",
                "骑行",
                "力量训练",
                "球类运动",
                "其他",
              ])}
              {num("duration", "运动时长（分钟）")}
              {num("distance", "距离（km，可不填）")}
              {num("steps", "步数（可不填）")}
              {text("start", "发生时间", "time")}
            </>
          )}
          {kind === "mood" && (
            <>
              {["mood", "stress"].map((key) => (
                <Field
                  key={key}
                  label={
                    key === "mood"
                      ? "心情：1 低落 — 5 愉快"
                      : "压力：1 轻松 — 5 很大"
                  }
                >
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={r[key as "mood" | "stress"]}
                    onChange={(e) => setR({ ...r, [key]: +e.target.value })}
                  />
                  <small>当前：{r[key as "mood" | "stress"]}</small>
                </Field>
              ))}
              {text("start", "记录时间", "time")}
            </>
          )}
          {kind === "course" && (
            <>
              <Field label="星期" error={errors.weekday}>
                <select
                  value={r.weekday}
                  onChange={(e) => setR({ ...r, weekday: +e.target.value })}
                >
                  {["一", "二", "三", "四", "五", "六", "日"].map((v, i) => (
                    <option key={v} value={i + 1}>
                      星期{v}
                    </option>
                  ))}
                </select>
              </Field>
              {text("weeks", "教学周", "text", "例如 1-18 或 1,3,5")}
              {text("start", "开始时间", "time")}
              {text("end", "结束时间", "time")}
              {text("place", "上课地点")}
              {text("teacher", "教师（可不填）")}
            </>
          )}
          {kind === "task" && (
            <>
              {text("start", "开始时间", "time")}
              {num("duration", "预计时长（分钟）")}
              {text("place", "地点（可不填）")}
              <Field label="任务状态">
                <select
                  value={r.done ? "done" : "pending"}
                  onChange={(e) =>
                    setR({ ...r, done: e.target.value === "done" })
                  }
                >
                  <option value="pending">未完成</option>
                  <option value="done">已完成</option>
                </select>
              </Field>
            </>
          )}
        </div>
        <Field label="备注（可不填）">
          <textarea
            value={r.note ?? ""}
            onChange={(e) => setR({ ...r, note: e.target.value })}
            rows={2}
          />
        </Field>
        <div className={s.formActions}>
          <button type="button" className={s.secondary} onClick={close}>
            取消
          </button>
          <button className={s.primary} disabled={busy}>
            {busy ? "保存中…" : "保存记录"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
