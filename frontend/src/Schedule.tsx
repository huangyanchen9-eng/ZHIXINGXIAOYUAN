import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  CalendarBlank,
  UploadSimple,
  ArrowLeft,
  ArrowRight,
  MapPin,
} from "@phosphor-icons/react";
import { useApp } from "./store";
import { PageHead, Card, AddButton, Field, Badge, Modal, Empty } from "./ui";
import { today, dateISO } from "./seed";
import { courseOnDate, uid, weeksList, minutes } from "./domain";
import type { LifeRecord } from "./types";
import s from "./App.module.css";
export function Schedule() {
  const { data, edit, update, notify } = useApp();
  const [offset, setOffset] = useState(0),
    [upload, setUpload] = useState(false),
    [preview, setPreview] = useState(""),
    [sample, setSample] = useState(false),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<LifeRecord | null>(null),
    [uploadError, setUploadError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date);
    d.setDate(d.getDate() + i);
    return dateISO(d);
  });
  const week =
    Math.floor(
      (+date - +new Date(data!.preferences.termStart + "T00:00")) / 604800000,
    ) + 1;
  const courses = data!.records.filter((r) => r.kind === "course");
  const closeUpload = () => {
    setUpload(false);
    setPreview("");
    setResult(null);
    setSample(false);
    setUploadError("");
  };
  return (
    <>
      <PageHead
        eyebrow="STUDY / 我的课表"
        title="每一节课，都心中有数"
        description="课表与今日安排同步。点击课程，即可查看详情或规划出发路线。"
        action={
          <div className={s.buttonRow}>
            <button className={s.secondary} onClick={() => setUpload(true)}>
              <UploadSimple size={18} />
              导入课表
            </button>
            <AddButton onClick={() => edit("course")}>添加课程</AddButton>
          </div>
        }
      />
      <Card>
        <div className={s.weekControl}>
          <button
            className={s.iconButton}
            aria-label="上一周"
            onClick={() => setOffset(offset - 1)}
          >
            <ArrowLeft size={20} />
          </button>
          <strong>
            {days[0]} — {days[6]} <Badge>第 {week} 周</Badge>
          </strong>
          <button
            className={s.iconButton}
            aria-label="下一周"
            onClick={() => setOffset(offset + 1)}
          >
            <ArrowRight size={20} />
          </button>
          <button className={s.textButton} onClick={() => setOffset(0)}>
            回到本周
          </button>
        </div>
        <div className={s.scheduleScroll}>
          <div className={s.weekGrid}>
            {days.map((d, i) => (
              <div className={s.weekColumn} key={d}>
                <div className={d === today ? s.todayColumn : ""}>
                  <span>周{"一二三四五六日"[i]}</span>
                  <strong>{d.slice(8)}</strong>
                </div>
                {courses
                  .filter((r) =>
                    courseOnDate(r, d, data!.preferences.termStart),
                  )
                  .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""))
                  .map((r, index) => (
                    <div
                      className={`${s.courseTile} ${index % 2 ? s.courseWarm : ""}`}
                      key={r.id}
                    >
                      <button onClick={() => edit(r)}>
                        <small>
                          {r.start}—{r.end}
                        </small>
                        <strong>{r.title}</strong>
                        <span>{r.place}</span>
                        <small>
                          {r.teacher} · {r.weeks} 周
                        </small>
                      </button>
                      <Link
                        to={"/travel?to=" + encodeURIComponent(r.place ?? "")}
                      >
                        <MapPin size={13} />
                        去这里
                      </Link>
                    </div>
                  ))}
                {!courses.some((r) =>
                  courseOnDate(r, d, data!.preferences.termStart),
                ) && <p className={s.noCourse}>自由安排</p>}
              </div>
            ))}
          </div>
        </div>
        <p className={s.note}>
          课表按教学周显示 · 学期开始日期可在偏好设置中修改 ·
          示例课程已标注在记录详情
        </p>
      </Card>
      <div className={s.twoCol}>
        <Card>
          <h2>今日课程提醒</h2>
          {courses
            .filter((r) => courseOnDate(r, today, data!.preferences.termStart))
            .map((r) => (
              <div className={s.listLine} key={r.id}>
                <CalendarBlank size={22} />
                <div>
                  <strong>{r.title}</strong>
                  <small>
                    {r.start} · {r.place} · 提前 {data!.preferences.lead}{" "}
                    分钟到达
                  </small>
                </div>
                <Link to={"/travel?to=" + encodeURIComponent(r.place ?? "")}>
                  规划路线
                </Link>
              </div>
            ))}
          {!courses.some((r) =>
            courseOnDate(r, today, data!.preferences.termStart),
          ) && <Empty title="今天没有课程" />}
          <p className={s.note}>
            提醒显示在应用内；出发时间需先获取真实路线后计算。
          </p>
        </Card>
        <Card>
          <h2>管理全部课程</h2>
          {courses.map((r) => (
            <div className={s.listLine} key={r.id}>
              <div>
                <strong>{r.title}</strong>
                <small>
                  周{"一二三四五六日"[(r.weekday ?? 1) - 1]} · {r.weeks} 周
                </small>
              </div>
              <button className={s.textButton} onClick={() => edit(r)}>
                编辑
              </button>
              <button
                className={s.textButton}
                onClick={() => {
                  if (confirm("删除这门课程？"))
                    void update((d) => ({
                      ...d,
                      records: d.records.filter((x) => x.id !== r.id),
                    }));
                }}
              >
                删除
              </button>
            </div>
          ))}
        </Card>
      </div>
      {upload && (
        <Modal title="导入课表" onClose={closeUpload}>
          <p className={s.notice}>
            OCR
            流程演示：示例可模拟识别；自己的图片仅预览并手动录入，尚未接入识别服务。
          </p>
          <div className={s.buttonRow}>
            <button
              className={s.secondary}
              onClick={() => file.current?.click()}
            >
              <UploadSimple size={18} />
              选择图片
            </button>
            <button
              className={s.secondary}
              onClick={() => {
                setSample(true);
                setPreview("");
                setResult(null);
              }}
            >
              载入示例课表
            </button>
          </div>
          <input
            hidden
            ref={file}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (
                !["image/png", "image/jpeg"].includes(f.type) ||
                f.size > 8 * 1024 * 1024
              ) {
                setUploadError("请选择不超过 8 MB 的 PNG 或 JPG 图片");
                return;
              }
              setUploadError("");
              const reader = new FileReader();
              reader.onload = () => {
                setPreview(String(reader.result));
                setSample(false);
                setResult(null);
              };
              reader.readAsDataURL(f);
            }}
          />
          {uploadError && (
            <p className={s.error} role="alert">
              {uploadError}
            </p>
          )}
          {preview && (
            <>
              <img
                className={s.uploadPreview}
                src={preview}
                alt="上传的课表预览"
              />
              <button
                className={s.primary}
                onClick={() => {
                  closeUpload();
                  edit("course");
                }}
              >
                对照图片，手动录入课程
              </button>
            </>
          )}
          {sample && (
            <>
              <div className={s.sampleSchedule}>
                <strong>示例课表 · 周三</strong>
                <p>14:00—15:35　大学英语　百川楼</p>
              </div>
              <button
                className={s.primary}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await new Promise((r) => setTimeout(r, 450));
                  setResult({
                    id: uid(),
                    kind: "course",
                    title: "大学英语",
                    date: today,
                    weekday: 3,
                    start: "14:00",
                    end: "15:35",
                    weeks: "1-18",
                    place: "百川楼",
                    source: "示例",
                  });
                  setBusy(false);
                }}
              >
                {busy ? "正在演示识别…" : "演示识别"}
              </button>
            </>
          )}
          {result && (
            <div className={s.notice}>
              <strong>示例识别结果：{result.title}</strong>
              <p>
                {result.start}—{result.end} · {result.place}
              </p>
              <button
                className={s.secondary}
                onClick={() => {
                  closeUpload();
                  edit(result);
                }}
              >
                校对并保存课程
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
