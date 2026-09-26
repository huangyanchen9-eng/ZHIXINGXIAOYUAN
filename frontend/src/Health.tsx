import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Moon,
  Footprints,
  ForkKnife,
  Smiley,
  DownloadSimple,
  Plus,
} from "@phosphor-icons/react";
import { useApp } from "./store";
import { today, dateISO } from "./seed";
import { sleepHours, mealTotals, download, exportCsv } from "./domain";
import { kindLabels, type Kind } from "./types";
import { PageHead, Card, Field, Trend, Empty, RecordRow, Badge } from "./ui";
import s from "./App.module.css";
function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return dateISO(d);
}
export function Health({ openRecord }: { openRecord: () => void }) {
  const { data, edit } = useApp();
  const [start, setStart] = useState(weekAgo()),
    [end, setEnd] = useState(today),
    [predict, setPredict] = useState(false);
  const invalid = !start || !end || start > end;
  const records = invalid
    ? []
    : data!.records.filter((r) => r.date >= start && r.date <= end);
  const sleeps = records.filter((r) => r.kind === "sleep");
  const avgSleep = sleeps.length
    ? sleeps.reduce((n, r) => n + sleepHours(r.sleepStart!, r.sleepEnd!), 0) /
      sleeps.length
    : null;
  const active = records.filter((r) => r.kind === "exercise");
  const moods = records.filter((r) => r.kind === "mood");
  const meals = mealTotals(records);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date((end || today) + "T12:00");
    d.setDate(d.getDate() - 6 + i);
    return dateISO(d);
  });
  const [metric, setMetric] = useState("运动时长");
  const vals = days.map((d) => {
    const rs = records.filter((r) => r.date === d);
    return metric === "运动时长"
      ? rs
          .filter((r) => r.kind === "exercise")
          .reduce((a, r) => a + (r.duration ?? 0), 0)
      : metric === "睡眠时长"
        ? rs
            .filter((r) => r.kind === "sleep")
            .reduce((a, r) => a + sleepHours(r.sleepStart!, r.sleepEnd!), 0)
        : rs
            .filter((r) => r.kind === "mood")
            .reduce((a, r) => a + (r.mood ?? 0), 0) /
          Math.max(1, rs.filter((r) => r.kind === "mood").length);
  });
  return (
    <div className={s.healthPage}>
      <PageHead
        eyebrow="FEEL WELL / 健康分析"
        title="听见身体，也照顾心情"
        description="来自你的手动与示例记录。这里提供生活回顾，不代替健康诊断。"
        action={
          <button className={s.primary} onClick={() => edit("sleep")}>
            记录昨夜睡眠
          </button>
        }
      />
      <Card>
        <div className={s.formGrid}>
          <Field label="开始日期">
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="结束日期">
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
        </div>
        {invalid && (
          <p role="alert" className={s.error}>
            请选择有效日期，结束日期不能早于开始日期。
          </p>
        )}
      </Card>
      <div className={s.metricGrid} style={{ marginTop: 20 }}>
        {[
          {
            icon: Moon,
            name: "平均睡眠",
            v: avgSleep?.toFixed(1) ?? "—",
            unit: "小时",
            hint: sleeps.length + " 条睡眠记录",
          },
          {
            icon: Footprints,
            name: "累计运动",
            v: active.reduce((a, r) => a + (r.duration ?? 0), 0),
            unit: "分钟",
            hint: active.length + " 条运动记录",
          },
          {
            icon: ForkKnife,
            name: "已吃三餐",
            v: meals.count,
            unit: "次",
            hint: `${meals.known} 条含营养信息`,
          },
          {
            icon: Smiley,
            name: "平均心情",
            v: moods.length
              ? (
                  moods.reduce((a, r) => a + (r.mood ?? 0), 0) / moods.length
                ).toFixed(1)
              : "—",
            unit: "/ 5",
            hint: moods.length + " 条心情记录",
          },
        ].map(({ icon: Icon, name, v, unit, hint }) => (
          <Card key={name}>
            <span className={s.metricLabel}>
              <Icon size={17} />
              {name}
            </span>
            <div className={s.metricValue}>
              {v}
              <small>{unit}</small>
            </div>
            <span className={s.metricHint}>{hint}</span>
          </Card>
        ))}
      </div>
      {records.length ? (
        <div className={s.twoCol}>
          <Card>
            <h2>生活节奏，慢慢看见</h2>
            <div className={s.tabs}>
              {["运动时长", "睡眠时长", "心情"].map((t) => (
                <button
                  className={metric === t ? s.tabActive : ""}
                  key={t}
                  onClick={() => setMetric(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <Trend
              color="#ffffff"
              values={vals}
              labels={days.map((d) => d.slice(5))}
            />
            <p className={s.note}>
              显示所选结束日期之前 7 天；无记录日期表示未记录，不代表实际为零。
            </p>
          </Card>
          <Card>
            <h2>给自己的小小建议</h2>
            <div className={s.listLine}>
              <Moon size={22} />
              <div>
                <strong>给休息留一个位置</strong>
                <small>
                  {avgSleep === null
                    ? "记录入睡和起床时间，才能看见自己的节奏。"
                    : `本期平均记录 ${avgSleep.toFixed(1)} 小时睡眠。试着让每天的作息更规律。`}
                </small>
              </div>
            </div>
            <div className={s.listLine}>
              <ForkKnife size={22} />
              <div>
                <strong>三餐，别忘了认真对待</strong>
                <small>计划不算已摄入，吃完后再补上一条记录。</small>
              </div>
            </div>
            <div className={s.listLine}>
              <Smiley size={22} />
              <div>
                <strong>心情也值得被听见</strong>
                <small>可以写一段备注，或找 AI 伴航聊聊今天。</small>
              </div>
            </div>
            <Link to="/assistant" className={s.textButton}>
              打开 AI 伴航
            </Link>
          </Card>
        </div>
      ) : (
        <Empty title="这段时间还没有健康记录" />
      )}
      <Card className={`${s.settingsGroup} ${s.healthPrediction}`}>
        <div className={s.sectionTitle}>
          <h2>下一周健康趋势</h2>
          <Badge tone="orange">LSTM 预测演示</Badge>
        </div>
        <p className={s.muted}>
          展示未来模型报告的交互形式。以下固定示例曲线不是对你个人健康的预测，也未运行
          LSTM。
        </p>
        <button
          className={s.secondary}
          style={{ marginTop: 15 }}
          onClick={() => setPredict(!predict)}
        >
          {predict ? "收起预测演示" : "查看预测演示"}
        </button>
        {predict && (
          <>
            <Trend
              color="#ffffff"
              values={[74, 77, 76, 80, 79, 82, 81]}
              labels={["周一", "周二", "周三", "周四", "周五", "周六", "周日"]}
            />
            <p className={s.note}>示例健康分（0—100），不作为实测健康结论。</p>
          </>
        )}
      </Card>
      <div className={s.healthActions}>
        <button className={s.secondary} onClick={openRecord} aria-label="记录">
          <Plus size={19} />
          记录
        </button>
      </div>
    </div>
  );
}
export function History() {
  const { data } = useApp();
  const [kind, setKind] = useState("all"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(today),
    [query, setQuery] = useState("");
  const invalid = !!start && !!end && start > end;
  const rows = invalid
    ? []
    : data!.records
        .filter(
          (r) =>
            (kind === "all" || r.kind === kind) &&
            (!start || r.date >= start) &&
            (!end || r.date <= end) &&
            r.title.includes(query),
        )
        .sort((a, b) => b.date.localeCompare(a.date));
  const modes = rows
    .filter(
      (r) =>
        r.kind === "exercise" ||
        (r.kind === "task" && r.done && r.source === "地图" && r.mode),
    )
    .reduce<Record<string, number>>((a, r) => {
      a[r.mode ?? "其他"] = (a[r.mode ?? "其他"] ?? 0) + 1;
      return a;
    }, {});
  return (
    <div className={s.historyPage}>
      <PageHead
        eyebrow="LOOK BACK / 生活记录"
        title="每一个日常，都有迹可循"
        description="回顾、编辑和导出自己的记录。示例数据可单独编辑或删除。"
        action={
          <button
            className={s.secondary}
            disabled={!rows.length || invalid}
            onClick={() =>
              download(
                "智行校园-历史记录.csv",
                exportCsv(rows),
                "text/csv;charset=utf-8",
              )
            }
          >
            <DownloadSimple size={18} />
            导出筛选结果
          </button>
        }
      />
      <Card>
        <div className={s.filters}>
          <Field label="记录类型">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">全部记录</option>
              {Object.entries(kindLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="开始日期">
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="结束日期">
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
          <Field label="搜索记录">
            <input
              placeholder="输入关键词"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
        </div>
        {invalid ? (
          <p className={s.error} role="alert">
            结束日期不能早于开始日期。
          </p>
        ) : (
          <Badge>{rows.length} 条记录</Badge>
        )}
        {rows.length ? (
          rows.map((r) => <RecordRow key={r.id} record={r} />)
        ) : (
          <Empty
            title="没有找到匹配记录"
            text="调整日期或分类，或者从首页记录一件小事。"
          />
        )}
      </Card>
      <div className={s.twoCol}>
        <Card>
          <h2>记录分类</h2>
          <Trend
            color="#ffffff"
            values={Object.keys(kindLabels).map(
              (k) => rows.filter((r) => r.kind === k).length,
            )}
            labels={Object.values(kindLabels)}
          />
        </Card>
        <Card>
          <h2>出行与运动方式</h2>
          {Object.keys(modes).length ? (
            Object.entries(modes).map(([k, v]) => (
              <div className={s.listLine} key={k}>
                <div>{k}</div>
                <Badge>{v} 次</Badge>
              </div>
            ))
          ) : (
            <Empty title="还没有出行或运动记录" />
          )}
          <Link className={s.textButton} to="/health">
            查看睡眠、活动与心情趋势
          </Link>
          <Link className={s.textButton} style={{ marginLeft: 15 }} to="/meals">
            查看三餐偏好
          </Link>
        </Card>
      </div>
    </div>
  );
}
