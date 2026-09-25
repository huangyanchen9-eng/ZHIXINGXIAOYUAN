import { isDemo } from "./services";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  PaperPlaneTilt,
  ChatCircleDots,
  Medal,
  Leaf,
  BookOpen,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { useApp } from "./store";
import { awardLesson, uid } from "./domain";
import { today } from "./seed";
import { PageHead, Card, Badge, Empty } from "./ui";
import s from "./App.module.css";
const lessonId = "green-campus-01";
const questions = [
  {
    q: "哪种行动更符合校园绿色出行？",
    options: [
      "适合步行的短距离，优先步行",
      "所有短距离都乘车",
      "为了积分虚构运动记录",
    ],
    answer: 0,
    explanation:
      "在时间、天气与身体条件允许时，短距离步行是绿色出行的一种选择。",
  },
  {
    q: "完成一项校园任务后，怎样让记录更有意义？",
    options: [
      "只记录计划，直接当成完成",
      "如实记录完成情况，再回顾调整",
      "反复提交同一次活动累加积分",
    ],
    answer: 1,
    explanation: "区分计划与实际完成，可以帮助我们认识真实的生活习惯。",
  },
  {
    q: "将课程和就餐加入行程时，应该注意什么？",
    options: ["只计算路程", "只计算就餐", "同时考虑出行、停留和课程开始时间"],
    answer: 2,
    explanation: "预留路程与停留时间，才能让多任务安排更从容。",
  },
];
function Radar({ values }: { values: number[] }) {
  const center = 150,
    rad = 95;
  const point = (i: number, v: number) => [
    center + (Math.sin((i * Math.PI * 2) / 5) * rad * v) / 100,
    center - (Math.cos((i * Math.PI * 2) / 5) * rad * v) / 100,
  ];
  return (
    <svg
      viewBox="0 0 300 300"
      className={s.radar}
      role="img"
      aria-label="五维成长图，分数为演示活动积分映射"
    >
      {[25, 50, 75, 100].map((v) => (
        <polygon
          key={v}
          points={Array.from({ length: 5 }, (_, i) =>
            point(i, v).join(","),
          ).join(" ")}
          fill="none"
          stroke="#dbe8f6"
        />
      ))}
      {values.map((_, i) => (
        <line
          key={i}
          x1={150}
          y1={150}
          x2={point(i, 100)[0]}
          y2={point(i, 100)[1]}
          stroke="#e8eff8"
        />
      ))}
      <polygon
        points={values.map((v, i) => point(i, v).join(",")).join(" ")}
        fill="#7bb6ef66"
        stroke="#388bda"
        strokeWidth="2"
      />
      {["思想品德", "学术规划", "运动健康", "绿色低碳", "心理关照"].map(
        (v, i) => (
          <text
            key={v}
            x={point(i, 128)[0]}
            y={point(i, 128)[1]}
            textAnchor="middle"
            fill="#6887a8"
            fontSize="10"
          >
            {v}
          </text>
        ),
      )}
    </svg>
  );
}
export function Growth() {
  const { data, update, notify } = useApp();
  const [quiz, setQuiz] = useState(false),
    [answers, setAnswers] = useState<Record<number, number>>({}),
    [submitted, setSubmitted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const score = questions.reduce(
    (n, q, i) => n + (answers[i] === q.answer ? 10 : 0),
    0,
  );
  const points = data!.awards.reduce((n, a) => n + a.score, 0);
  const exercises = data!.records.filter((r) => r.kind === "exercise");
  const km =
    exercises
      .filter((r) => ["步行", "骑行", "跑步"].includes(r.mode ?? ""))
      .reduce((a, r) => a + (r.distance ?? 0), 0) +
    data!.records
      .filter(
        (r) =>
          r.kind === "task" &&
          r.done &&
          r.source === "地图" &&
          ["步行", "骑行", "跑步"].includes(r.mode ?? ""),
      )
      .reduce((n, r) => n + (r.distance ?? 0), 0);
  const radar = [
    Math.min(100, points * 2),
    Math.min(
      100,
      data!.records.filter((r) => r.kind === "course").length * 10 + points,
    ),
    Math.min(100, exercises.length * 10),
    Math.min(100, km * 3),
    Math.min(100, data!.records.filter((r) => r.kind === "mood").length * 10),
  ];
  return (
    <>
      <PageHead
        eyebrow="GROW A LITTLE / 五育成长"
        title="每天一点点，看见更好的自己"
        description="学习、行动与回顾，让成长有迹可循。成长分是演示活动映射，不是学校认定的评价。"
      />
      <div className={s.metricGrid}>
        <Card>
          <span className={s.metricLabel}>
            <Medal size={18} />
            累计学习积分
          </span>
          <div className={s.metricValue}>
            {points}
            <small>分</small>
          </div>
          <small className={s.metricHint}>同一微课仅计分一次</small>
        </Card>
        <Card>
          <span className={s.metricLabel}>
            <BookOpen size={18} />
            完成微课
          </span>
          <div className={s.metricValue}>
            {data!.awards.length}
            <small>课</small>
          </div>
        </Card>
        <Card>
          <span className={s.metricLabel}>
            <Leaf size={18} />
            绿色出行记录
          </span>
          <div className={s.metricValue}>
            {km.toFixed(1)}
            <small>km</small>
          </div>
        </Card>
        <Card>
          <span className={s.metricLabel}>减排估算演示</span>
          <div className={s.metricValue}>
            {(km * 0.2485).toFixed(1)}
            <small>kg</small>
          </div>
          <small className={s.metricHint}>
            原 demo 系数：0.2485 kg/km，非实测
          </small>
        </Card>
      </div>
      <div className={s.twoCol}>
        <Card>
          <Badge>今日微课 · 约 3 分钟</Badge>
          <div className={s.lesson}>
            <h2 style={{ marginTop: 17 }}>校园绿色行动，从一件小事开始</h2>
            <h3>01 / 为自己的选择负责</h3>
            <p>
              成长不只发生在课堂里。守时、认真完成任务、尊重他人，也是在校园里练习责任感。记录生活不是为了追求完美，而是为了更了解自己。
            </p>
            <h3>02 / 把绿色变成习惯</h3>
            <p>
              选择合适的步行路线，按需取餐，带上自己的水杯。把一件件小事做好，绿色生活就有了具体的样子。出行仍需结合天气、时间和自身状态。
            </p>
            <h3>03 / 在计划中照顾自己</h3>
            <p>
              把上课、三餐和休息放进同一份计划，给路程留时间。没有完成的任务可以调整，不必把一天排得满满当当。
            </p>
          </div>
          <button
            className={s.primary}
            style={{ marginTop: 20 }}
            onClick={() => {
              setQuiz(true);
              setSubmitted(false);
              setAnswers({});
              setError("");
            }}
          >
            {quiz ? "重新开始微测验" : "开始微测验"}
          </button>
          <p className={s.note}>
            预置题库演示，后续接入 AI 出题。重做可复习，不重复增加积分。
          </p>
          {quiz && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (Object.keys(answers).length !== questions.length) {
                  setError("请完成全部题目后提交");
                  return;
                }
                setBusy(true);
                setError("");
                try {
                  await update((d) => awardLesson(d, lessonId, score));
                  setSubmitted(true);
                  notify("答案已保存；同一微课不重复计分");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {questions.map((q, i) => (
                <div className={s.quizQuestion} key={q.q}>
                  <h3>
                    {i + 1}. {q.q}
                  </h3>
                  {q.options.map((o, j) => (
                    <label key={o} className={s.quizOption}>
                      <input
                        type="radio"
                        name={"question" + i}
                        checked={answers[i] === j}
                        disabled={submitted}
                        onChange={() => setAnswers({ ...answers, [i]: j })}
                      />
                      {o}
                    </label>
                  ))}
                  {submitted && (
                    <p className={s.note}>
                      {answers[i] === q.answer
                        ? "回答正确。"
                        : "正确答案：" + q.options[q.answer] + "。"}
                      {q.explanation}
                    </p>
                  )}
                </div>
              ))}
              {error && (
                <p className={s.error} role="alert">
                  {error}
                </p>
              )}
              {submitted ? (
                <p className={s.notice}>
                  本次答题 {score} / 30
                  分。积分按首次提交记录；复习不会重复加分。
                </p>
              ) : (
                <button className={s.primary} disabled={busy}>
                  {busy ? "提交中…" : "提交答案"}
                </button>
              )}
            </form>
          )}
        </Card>
        <div>
          <Card>
            <h2>五维成长足迹</h2>
            <Radar values={radar} />
            <p className={s.note}>
              思想品德＝学习积分×2；学术规划＝课程数×10＋积分；运动健康＝运动记录数×10；绿色低碳＝距离×3；心理关照＝心情记录数×10。各项上限
              100，仅作产品演示。
            </p>
          </Card>
          <Card className={s.settingsGroup}>
            <h2>成长时间线</h2>
            {data!.awards.length ? (
              data!.awards.map((a) => (
                <div className={s.listLine} key={a.lesson}>
                  <Medal size={23} />
                  <div>
                    <strong>完成校园绿色行动微课</strong>
                    <small>{a.date}</small>
                  </div>
                  <Badge>+{a.score} 分</Badge>
                </div>
              ))
            ) : (
              <Empty
                title="第一份成长，等你点亮"
                text="读完微课并完成测验，这里就会留下记录。"
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
export function Assistant() {
  const { data, update } = useApp();
  const [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [data!.messages.length]);
  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setInput("");
    setError("");
    try {
      const message = { id: uid(), role: "user" as const, text: text.trim() };
      await update((d) => ({ ...d, messages: [...d.messages, message] }));
      let reply =
          "我在这里。可以告诉我你想安排的课程、想去的地点，或今天的感受。当前是预设场景演示，尚未接入真实大模型。",
        link = "/all",
        label = "看看校园生活功能";
      if (/吃|餐|饿/.test(text)) {
        reply =
          "先给自己留出好好吃饭的时间。你可以按早餐、午餐、晚餐选择搭配，设置预算和忌口，再把用餐地点加入行程。";
        link = "/meals";
        label = "去看看三餐搭配";
      } else if (/课|迟到|路|走|去|图书馆/.test(text)) {
        const course = data!.records.find((r) => r.kind === "course");
        reply = `先别着急，我们一步一步来。${course ? "课表里有“" + course.title + "”，地点是" + course.place + "。" : ""}在出行页确认起终点，核实路网后查看登记路程与估算时间；我不会在这里编造路线或到达时间。`;
        link =
          "/travel" +
          (course ? "?to=" + encodeURIComponent(course.place ?? "") : "");
        label = "打开校园路线规划";
      } else if (/焦虑|难过|累|心情|压力|烦/.test(text)) {
        reply =
          "听起来今天有些不容易。先给自己一点缓冲，可以暂时放下手头的事，喝口水，或者找信任的人聊聊。你也可以把感受记下来，不需要写得很完整。";
        link = "/health";
        label = "回顾最近的生活状态";
      } else if (/安排|计划|今天/.test(text)) {
        reply = `你今天有 ${data!.records.filter((r) => r.kind === "task" && r.date === today && !r.done).length} 项未完成待办。可以先安排有固定时间的事，再留出三餐和休息的位置。`;
        link = "/planner";
        label = "整理今天的行程";
      }
      await new Promise((r) => setTimeout(r, 450));
      if (!alive.current) return;
      await update((d) => ({
        ...d,
        messages: [
          ...d.messages,
          { id: uid(), role: "assistant", text: reply, link, label },
        ],
      }));
    } catch {
      setError("消息保存失败，请检查连接后重试");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={s.chat}>
      <PageHead
        eyebrow="ALWAYS BY YOUR SIDE / AI 伴航"
        title="校园里的事，慢慢说"
        description="预设场景演示 · 可以聊聊行程、三餐和心情，尚未接入真实 AI。"
        action={
          <button
            className={s.secondary}
            onClick={() => {
              if (confirm("清空当前用户的会话？"))
                void update((d) => ({ ...d, messages: [] }));
            }}
          >
            清空会话
          </button>
        }
      />
      <div className={s.chatWindow}>
        {!data!.messages.length && (
          <div className={s.message}>
            <small>智行伴航 · 演示</small>
            <ChatCircleDots size={30} weight="duotone" />
            <p>
              你好，很高兴陪你开始今天。
              <br />
              想去哪里，想吃什么，或有什么心事？
            </p>
          </div>
        )}
        {data!.messages.map((m) => (
          <div
            key={m.id}
            className={`${s.message} ${m.role === "user" ? s.userMessage : ""}`}
          >
            <small>{m.role === "user" ? "我" : "智行伴航 · 演示回复"}</small>
            {m.text}
            {m.link && (
              <div>
                <Link to={m.link} className={s.textButton}>
                  {m.label}
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <p className={s.muted} role="status">
            正在整理演示回复…
          </p>
        )}
        <div ref={bottom} />
      </div>
      <div className={s.prompts}>
        {["帮我安排今天", "午餐吃什么", "下一节课怎么走", "今天有一点累"].map(
          (t) => (
            <button disabled={busy} key={t} onClick={() => void send(t)}>
              {t}
            </button>
          ),
        )}
      </div>
      <form
        className={s.chatInput}
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          aria-label="发给 AI 伴航的消息"
          placeholder="说说你今天的想法…"
          maxLength={1500}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className={s.primary}
          disabled={busy || !input.trim()}
          aria-label="发送消息"
        >
          <PaperPlaneTilt size={21} />
        </button>
      </form>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <p className={s.note}>
        {isDemo()
          ? "会话保存在当前浏览器的演示空间。"
          : "对话历史保存在当前账号；AI 回复仍为示例服务。"}
      </p>
    </div>
  );
}
