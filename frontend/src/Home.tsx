import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarBlank,
  ChatCircleDots,
  GridFour,
  ForkKnife,
  Footprints,
  Moon,
  Sun,
  CheckCircle,
  MapTrifold,
  BookOpen,
  Plant,
} from "@phosphor-icons/react";
import { useApp } from "./store";
import { today, dateISO } from "./seed";
import { courseOnDate, sleepHours, mealTotals } from "./domain";
import { Card, SectionTitle, Badge, CampusArt, Empty, RecordRow } from "./ui";
import s from "./App.module.css";
export function Home({ openRecord }: { openRecord: () => void }) {
  const { user, data, edit } = useApp();
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
  const now = new Date().toTimeString().slice(0, 5);
  const next =
    courses
      .filter((r) => (r.end ?? "") > now)
      .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""))[0] ??
    courses[0];
  const sleep = dayRecords.find((r) => r.kind === "sleep");
  const steps = dayRecords
    .filter((r) => r.kind === "exercise")
    .reduce((a, r) => a + (r.steps ?? 0), 0);
  const meals = mealTotals(dayRecords);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowCount = d.records.filter((r) =>
    courseOnDate(r, dateISO(tomorrow), d.preferences.termStart),
  ).length;
  return (
    <>
      <div className={s.homeGreeting}>
        <div>
          <span className={s.eyebrow}>
            {new Date().toLocaleDateString("zh-CN", {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}{" "}
            · 大连海事大学
          </span>
          <h1>
            {user!.name}，今天也要好好生活<span>。</span>
          </h1>
          <p>把重要的事安排好，也为自己留一点时间。</p>
        </div>
        <div className={s.season}>
          <Sun size={25} weight="duotone" />
          <div>
            秋日校园<small>宜出发，也宜慢下来</small>
          </div>
        </div>
      </div>
      <section className={s.hero}>
        <div className={s.heroText}>
          <span className={s.heroLabel}>
            <span /> YOUR DAY, WELL PLANNED
          </span>
          <h2>
            每一程，
            <br />
            都走向更好的自己。
          </h2>
          <p>
            从一节课、一顿饭到一次散步，
            <br />
            让智行陪你，把今天过得刚刚好。
          </p>
          <Link className={s.primary} to="/planner">
            安排今日行程 <ArrowUpRight size={19} />
          </Link>
        </div>
        <CampusArt />
        <div className={s.heroCaption}>凌水校园 · 在这里，遇见你的日常</div>
      </section>
      <div className={s.shortcuts}>
        {[
          {
            to: "/schedule",
            icon: CalendarBlank,
            title: "我的课表",
            desc: "下一节，不慌张",
          },
          {
            to: "/assistant",
            icon: ChatCircleDots,
            title: "AI 伴航",
            desc: "想说的，都在这里",
          },
          {
            to: "/meals",
            icon: ForkKnife,
            title: "今天吃什么",
            desc: "认真对待每一餐",
          },
          {
            to: "/all",
            icon: GridFour,
            title: "全部功能",
            desc: "校园生活，一站抵达",
          },
        ].map(({ to, icon: Icon, title, desc }) => (
          <Link key={to} to={to}>
            <span>
              <Icon size={25} weight="duotone" />
            </span>
            <div>
              <strong>{title}</strong>
              <small>{desc}</small>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        ))}
      </div>
      <div className={s.dashboardGrid}>
        <div>
          <SectionTitle
            title="今天，按自己的节奏"
            to="/schedule"
            more="查看课表"
          />
          <Card>
            {next && (
              <div className={s.nextClass}>
                <div>
                  <Badge>今日课程</Badge>
                  <h3>{next.title}</h3>
                  <p>
                    {next.start}—{next.end} <span> · </span> {next.place}
                  </p>
                </div>
                <Link
                  to={"/travel?to=" + encodeURIComponent(next.place ?? "")}
                  className={s.roundLink}
                  aria-label="前往课程地点"
                >
                  <ArrowUpRight size={24} />
                </Link>
              </div>
            )}
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
                    </div>
                    <button
                      className={s.iconButton}
                      onClick={() => edit(r)}
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
            <button className={s.textButton} onClick={openRecord}>
              ＋ 添加一件今天想做的事
            </button>
          </Card>
          <div className={s.tomorrow}>
            <CalendarBlank size={21} />
            <div>
              <strong>给明天留一份从容</strong>
              <p>明天有 {tomorrowCount} 节课程，睡前再看一眼安排吧。</p>
            </div>
            <Link to="/schedule">
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
        <div>
          <SectionTitle title="生活的小小进度" to="/health" more="健康概览" />
          <Card>
            <div className={s.wellness}>
              <div
                className={s.progressRing}
                style={
                  {
                    "--progress": `${Math.min(100, steps / 80)}%`,
                  } as React.CSSProperties
                }
              >
                <Footprints size={23} />
                <strong>{steps.toLocaleString()}</strong>
                <small>今日步数</small>
              </div>
              <div className={s.wellnessCopy}>
                <Badge tone="orange">慢慢来，也很好</Badge>
                <h3>每一步，都算数</h3>
                <p>
                  手动 / 示例记录
                  <br />
                  每日参考目标 8,000 步
                </p>
              </div>
            </div>
            <div className={s.healthMini}>
              <div>
                <Moon size={20} />
                <span>
                  昨夜睡眠
                  <strong>
                    {sleep
                      ? sleepHours(sleep.sleepStart!, sleep.sleepEnd!)
                      : "—"}{" "}
                    <small>小时</small>
                  </strong>
                </span>
              </div>
              <div>
                <ForkKnife size={20} />
                <span>
                  三餐记录
                  <strong>
                    {meals.count} <small>次已记录</small>
                  </strong>
                </span>
              </div>
            </div>
            <button className={`${s.secondary} ${s.full}`} onClick={openRecord}>
              记录我的生活 <ArrowRight size={16} />
            </button>
          </Card>
          <section className={s.learningCard}>
            <div className={s.learningTop}>
              <BookOpen size={24} weight="duotone" />
              <small>给成长，留 3 分钟</small>
            </div>
            <h3>
              从一件小事，
              <br />
              开始绿色校园生活。
            </h3>
            <p>今日微课 · 低碳行动与青年担当</p>
            <Link to="/growth">
              开始今日伴学 <ArrowUpRight size={18} />
            </Link>
            <Plant className={s.learningPlant} size={90} weight="duotone" />
          </section>
        </div>
      </div>
      <section className={s.dayAdvice}>
        <SectionTitle title="生活有序，也要有趣" />
        <div>
          {[
            {
              icon: Sun,
              title: "早晨 · 好好开始",
              text: "早餐、晨间伴学，留出从容出发的时间。",
            },
            {
              icon: BookOpen,
              title: "上午 · 专注当下",
              text: "专注一会儿，也记得喝水和放松双眼。",
            },
            {
              icon: MapTrifold,
              title: "下午 · 出去走走",
              text: "去图书馆，或者给自己安排一次散步。",
            },
            {
              icon: Moon,
              title: "晚间 · 慢慢收尾",
              text: "记录今天的心情，为明天留一份计划。",
            },
          ].map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <Icon size={24} weight="duotone" />
              <h3>{title}</h3>
              <p>{text}</p>
            </Card>
          ))}
        </div>
      </section>
      <footer className={s.pageFooter}>
        <Plant size={16} /> 好好学习，也好好生活。{" "}
        <span>ZHIXING CAMPUS / 2026</span>
      </footer>
    </>
  );
}
