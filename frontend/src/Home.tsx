import { Link } from "react-router-dom";
import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarBlank,
  ForkKnife,
  Footprints,
  Moon,
  Plus,
} from "@phosphor-icons/react";
import { useApp } from "./store";
import { today, dateISO } from "./seed";
import { courseOnDate, sleepHours, mealTotals } from "./domain";
import { nextAgendaItem } from "./homeAgenda";
import { Modal, Empty } from "./ui";
import s from "./App.module.css";
import h from "./Home.module.css";

export function Home({ openRecord }: { openRecord: () => void }) {
  const [clock, setClock] = useState(() => new Date());
  const [agenda, setAgenda] = useState(false);
  useEffect(() => {
    const refresh = () => setClock(new Date());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const { data, edit } = useApp();
  const d = data!;
  const dayRecords = d.records.filter((r) => r.date === today);
  const courses = d.records.filter((r) =>
    courseOnDate(r, today, d.preferences.termStart),
  );
  const timeline = [
    ...courses,
    ...dayRecords.filter(
      (r) => r.kind === "task" || (r.kind === "meal" && r.planned),
    ),
  ].sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  const upcoming = nextAgendaItem(timeline, clock);
  const sleep = dayRecords.find((r) => r.kind === "sleep");
  const steps = dayRecords
    .filter((r) => r.kind === "exercise")
    .reduce((sum, r) => sum + (r.steps ?? 0), 0);
  const meals = mealTotals(dayRecords);
  const tomorrow = new Date(clock);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowCount = d.records.filter((r) =>
    courseOnDate(r, dateISO(tomorrow), d.preferences.termStart),
  ).length;
  return (
    <div className={h.home}>
      <div className={h.intro}>
        <Link to="/growth" className={h.learningTitle}>
          <h1>
            <span>从一件小事，</span>
            <span>开始绿色校园生活。</span>
          </h1>
        </Link>
        <section className={h.widgets} aria-label="生活记录小组件">
          <Link
            to="/health"
            className={h.steps}
            aria-label={`今日步数 ${steps}，查看健康分析`}
            style={
              { "--progress": `${Math.min(100, steps / 80)}%` } as CSSProperties
            }
          >
            <div>
              <Footprints size={18} />
              <strong>{steps.toLocaleString()}</strong>
              <span>今日步数</span>
            </div>
          </Link>
          <Link to="/growth" className={h.widgetCaption}>
            <span>一点点行动，一点点成长</span>
            <small>Small steps, steady growth.</small>
          </Link>
          <div className={h.smallWidgets}>
            <Link
              to="/health"
              className={h.miniWidget}
              aria-label="昨晚睡眠，查看健康分析"
            >
              <Moon size={18} />
              <strong>
                {sleep ? sleepHours(sleep.sleepStart!, sleep.sleepEnd!) : "—"}
                <small>h</small>
              </strong>
              <span>昨晚睡眠</span>
            </Link>
            <Link
              to="/meals"
              className={h.miniWidget}
              aria-label="三餐记录，查看饮食"
            >
              <ForkKnife size={18} />
              <strong>
                {meals.count}
                <small>次</small>
              </strong>
              <span>三餐记录</span>
            </Link>
          </div>
        </section>
      </div>
      <div className={h.breathingSpace} aria-hidden="true" />
      <section className={h.floatingCard} aria-label="接下来的安排">
        <div className={h.floatingTop}>
          <span>
            <i /> 接下来
          </span>
          <button
            aria-label="打开今天的日程"
            aria-haspopup="dialog"
            onClick={() => setAgenda(true)}
          >
            <CalendarBlank size={23} />
          </button>
        </div>
        {upcoming ? (
          <>
            <div className={h.eventTime}>
              {upcoming.start}
              <span>
                {upcoming.kind === "course" && upcoming.end
                  ? `— ${upcoming.end}`
                  : upcoming.duration
                    ? `预计 ${upcoming.duration} 分钟`
                    : "今日安排"}
              </span>
            </div>
            <div className={h.eventSummary}>
              <div>
                <h2>{upcoming.title}</h2>
                <p>
                  {upcoming.place || "为这件事留一点时间"}
                  {upcoming.source === "示例" ? " · 示例" : ""}
                </p>
              </div>
              <button
                onClick={() => edit(upcoming)}
                aria-label="查看接下来的安排"
              >
                <ArrowUpRight size={22} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={h.eventTime}>
              留一点<span>时间给自己</span>
            </div>
            <div className={h.eventSummary}>
              <div>
                <h2>下一程，由你安排</h2>
                <p>暂时没有接下来的定时安排</p>
              </div>
              <button onClick={openRecord} aria-label="添加今日安排">
                <ArrowUpRight size={22} />
              </button>
            </div>
          </>
        )}
      </section>
      <div className={h.actions}>
        <button
          className={h.recordButton}
          onClick={openRecord}
          aria-label="记录"
        >
          <Plus size={20} />
          记录
        </button>
        <Link className={h.planButton} to="/planner">
          安排今日行程 <ArrowUpRight size={18} />
        </Link>
      </div>
      {agenda && (
        <Modal title="今天，按自己的节奏" onClose={() => setAgenda(false)}>
          <div className={h.agendaDate}>
            {clock.toLocaleDateString("zh-CN", {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
            <Link to="/schedule">
              查看课表 <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className={s.timeline}>
            {timeline.length ? (
              timeline.map((r) => (
                <div className={s.timelineItem} key={r.id}>
                  <time>{r.start ?? "待安排"}</time>
                  <span className={r.done ? s.timelineDone : ""} />
                  <div>
                    <strong>{r.title}</strong>
                    <small>
                      {r.place ?? "留一点时间给自己"} ·{" "}
                      {r.kind === "course"
                        ? "课程"
                        : r.kind === "meal"
                          ? "用餐计划"
                          : r.done
                            ? "已完成"
                            : "待办"}
                      {r.source === "示例" ? " · 示例" : ""}
                    </small>
                    {r.kind === "course" && r.place && (
                      <Link
                        className={h.courseLink}
                        to={"/travel?to=" + encodeURIComponent(r.place)}
                      >
                        前往课程地点 <ArrowUpRight size={13} />
                      </Link>
                    )}
                  </div>
                  <button
                    className={s.iconButton}
                    onClick={() => {
                      setAgenda(false);
                      edit(r);
                    }}
                    aria-label={"查看" + r.title}
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              ))
            ) : (
              <Empty title="今天的时间，由你安排" />
            )}
          </div>
          <button
            className={s.secondary}
            onClick={() => {
              setAgenda(false);
              openRecord();
            }}
          >
            ＋ 添加一件今天想做的事
          </button>
          <div className={h.tomorrow}>
            <CalendarBlank size={19} />
            <p>明天有 {tomorrowCount} 节课程，睡前再看一眼安排吧。</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
