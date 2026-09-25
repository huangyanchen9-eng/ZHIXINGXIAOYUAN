import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ForkKnife, ArrowUpRight, Plus, Check } from "@phosphor-icons/react";
import { useApp } from "./store";
import { menus, today } from "./seed";
import { filterMeals, mealTotals, uid } from "./domain";
import type { Meal, Menu } from "./types";
import {
  Card,
  PageHead,
  Field,
  Badge,
  Empty,
  RecordRow,
  AddButton,
} from "./ui";
import s from "./App.module.css";
export function Meals() {
  const { data, update, edit, notify } = useApp(),
    nav = useNavigate();
  const prefs = data!.preferences;
  const [meal, setMeal] = useState<Meal>("午餐"),
    [date, setDate] = useState(today),
    [budget, setBudget] = useState(prefs.budget),
    [taste, setTaste] = useState(prefs.taste),
    [avoid, setAvoid] = useState(prefs.avoid),
    [available, setAvailable] = useState(30),
    [health, setHealth] = useState(prefs.healthWeight * 10),
    [origin, setOrigin] = useState(""),
    [dest, setDest] = useState(""),
    [time, setTime] = useState("12:10"),
    [tab, setTab] = useState("今日推荐"),
    [selected, setSelected] = useState<string[]>([]);
  const results = filterMeals(menus, {
    meal,
    budget,
    taste,
    avoid,
    minutes: available,
  }).sort((a, b) =>
    health >= 5 ? b.protein / b.kcal - a.protein / a.kcal : a.cost - b.cost,
  );
  const rows = data!.records.filter(
    (r) => r.kind === "meal" && r.date === date,
  );
  const totals = mealTotals(rows);
  const history = data!.records.filter((r) => r.kind === "meal" && !r.planned);
  const add = async (m: Menu, planned: boolean) => {
    await update((d) => ({
      ...d,
      records: [
        ...d.records,
        {
          id: uid(),
          kind: "meal",
          date,
          title: m.food,
          meal: m.meal,
          start: time,
          duration: m.minutes,
          portion: "示例标准份",
          cost: m.cost,
          kcal: m.kcal,
          protein: m.protein,
          place: m.place,
          planned,
          source: "示例",
        },
      ],
    }));
    notify(planned ? "已加入用餐计划，未计入摄入" : "已记录用餐，来自示例菜单");
  };
  return (
    <>
      <PageHead
        eyebrow="EAT WELL / 三餐饮食"
        title="认真吃饭，也是认真生活"
        description="从早餐到晚餐，找到适合今天的那一份。推荐菜品与营养为示例，不代表食堂实时供应。"
        action={<AddButton onClick={() => edit("meal")}>记录一餐</AddButton>}
      />
      <div className={s.tabs}>
        {["今日推荐", "营养与记录", "历史偏好"].map((t) => (
          <button
            key={t}
            className={tab === t ? s.tabActive : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "今日推荐" ? (
        <>
          <Card>
            <div className={s.tabs}>
              {(["早餐", "午餐", "晚餐"] as Meal[]).map((m) => (
                <button
                  key={m}
                  className={meal === m ? s.tabActive : ""}
                  onClick={() => {
                    setMeal(m);
                    setTime(
                      m === "早餐" ? "07:20" : m === "午餐" ? "12:10" : "18:00",
                    );
                    setSelected([]);
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className={s.filters}>
              <Field label="就餐日期">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value || today)}
                />
              </Field>
              <Field label="就餐时间">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </Field>
              <Field label="预算上限（元）">
                <input
                  type="number"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(+e.target.value)}
                />
              </Field>
              <Field label="可用就餐时间（分钟）">
                <input
                  type="number"
                  min="1"
                  value={available}
                  onChange={(e) => setAvailable(+e.target.value)}
                />
              </Field>
              <Field label="口味">
                <select
                  value={taste}
                  onChange={(e) => setTaste(e.target.value)}
                >
                  {["不限", "清淡", "家常", "香辣"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="忌口食材（用逗号分隔）">
                <input
                  placeholder="例如：花生，鸡蛋"
                  value={avoid}
                  onChange={(e) => setAvoid(e.target.value)}
                />
              </Field>
              <Field label="当前位置（用于行程）">
                <input
                  value={origin}
                  placeholder="例如：图书馆"
                  onChange={(e) => setOrigin(e.target.value)}
                />
              </Field>
              <Field label="餐后目的地（可不填）">
                <input
                  value={dest}
                  placeholder="例如：学汇楼"
                  onChange={(e) => setDest(e.target.value)}
                />
              </Field>
            </div>
            <Field
              label={`健康优先度 ${health.toFixed(0)} / 10`}
              hint="偏高时按蛋白质 / 热量比排序，偏低时优先预算；仅用于示例方案比较。"
            >
              <input
                type="range"
                min="0"
                max="10"
                value={health}
                onChange={(e) => setHealth(+e.target.value)}
              />
            </Field>
            <p className={s.note}>
              可用时间按示例用餐时长筛选，不包含路程；点击“安排行程”获取真实路程并核对总耗时。
            </p>
          </Card>
          <div className={s.sectionTitle} style={{ marginTop: 24 }}>
            <h2>为你的{meal}，留几个选择</h2>
            <Badge>{results.length} 个匹配方案</Badge>
          </div>
          {results.length ? (
            <div className={s.mealGrid}>
              {results.map((m, i) => (
                <Card className={s.mealCard} key={m.id}>
                  <div
                    className={s.mealArt}
                    style={{
                      background: ["#e7f2ff", "#f5ecdf", "#edf6ff"][i % 3],
                    }}
                  >
                    <small>示例搭配 · {m.meal}</small>
                    <span>
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                  <div className={s.mealBody}>
                    <h3>{m.food}</h3>
                    <div className={s.mealMeta}>
                      <span>{m.place}</span>
                      <span>{m.taste}</span>
                    </div>
                    <strong>
                      ¥{m.cost}
                      <small> / 份</small>
                    </strong>
                    <p>
                      {m.kcal} kcal · 蛋白质 {m.protein} g · 约 {m.minutes} 分钟
                    </p>
                    <div className={s.buttonRow}>
                      <button
                        className={s.primary}
                        onClick={() => void add(m, true)}
                      >
                        加入计划
                      </button>
                      <button
                        className={s.secondary}
                        onClick={() => void add(m, false)}
                      >
                        记录已吃
                      </button>
                    </div>
                    <div className={s.mealMeta}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selected.includes(m.id)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, m.id]
                                : selected.filter((id) => id !== m.id),
                            )
                          }
                        />
                        对比
                      </label>
                      <button
                        className={s.textButton}
                        onClick={() =>
                          nav(
                            "/planner?meal=" +
                              encodeURIComponent(m.place) +
                              "&food=" +
                              encodeURIComponent(m.food) +
                              "&duration=" +
                              m.minutes +
                              "&from=" +
                              encodeURIComponent(origin) +
                              "&to=" +
                              encodeURIComponent(dest) +
                              "&time=" +
                              time +
                              "&date=" +
                              date,
                          )
                        }
                      >
                        安排行程
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty
              title="这次没有匹配的餐食"
              text="试着提高预算、增加用餐时间或调整口味。忌口条件会始终保留。"
            />
          )}
          {selected.length > 0 && (
            <Card>
              <h2>方案对比 · 示例营养</h2>
              <div className={s.comparison}>
                <table>
                  <thead>
                    <tr>
                      <th>搭配</th>
                      <th>价格</th>
                      <th>热量</th>
                      <th>蛋白质</th>
                      <th>就餐时长</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menus
                      .filter((m) => selected.includes(m.id))
                      .map((m) => (
                        <tr key={m.id}>
                          <td>{m.food}</td>
                          <td>¥{m.cost}</td>
                          <td>{m.kcal} kcal</td>
                          <td>{m.protein} g</td>
                          <td>{m.minutes} 分钟</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : tab === "营养与记录" ? (
        <>
          <Card>
            <Field label="查看日期">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value || today)}
              />
            </Field>
            <div className={s.metricGrid}>
              <div>
                <span className={s.metricLabel}>已记录用餐</span>
                <p className={s.metricValue}>
                  {totals.count}
                  <small>次</small>
                </p>
              </div>
              <div>
                <span className={s.metricLabel}>已知热量</span>
                <p className={s.metricValue}>
                  {totals.kcal ?? "—"}
                  <small>kcal</small>
                </p>
              </div>
              <div>
                <span className={s.metricLabel}>已填写营养</span>
                <p className={s.metricValue}>
                  {totals.known}
                  <small>/ {totals.count} 条</small>
                </p>
              </div>
              <div>
                <span className={s.metricLabel}>实际记录花费</span>
                <p className={s.metricValue}>¥{totals.cost}</p>
              </div>
            </div>
            <p className={s.notice}>
              只统计已吃记录。缺少营养信息的餐食显示未填写，不计入已知热量；示例与手动数据均可在详情修改。
            </p>
          </Card>
          {(["早餐", "午餐", "晚餐"] as Meal[]).map((m) => (
            <Card key={m} className={s.settingsGroup}>
              <h2>{m}</h2>
              {rows
                .filter((r) => r.meal === m)
                .map((r) => (
                  <div key={r.id}>
                    <RecordRow record={r} />
                    <div className={s.buttonRow}>
                      <small className={s.muted}>
                        热量：{r.kcal == null ? "未填写" : r.kcal + " kcal"}
                      </small>
                      {r.planned && (
                        <button
                          className={s.textButton}
                          onClick={() =>
                            void update((d) => ({
                              ...d,
                              records: d.records.map((x) =>
                                x.id === r.id ? { ...x, planned: false } : x,
                              ),
                            }))
                          }
                        >
                          标记已吃，计入记录
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              {!rows.some((r) => r.meal === m) && (
                <p className={s.muted}>还没有记录，记下今天的这一餐吧。</p>
              )}
            </Card>
          ))}
        </>
      ) : (
        <Card>
          <h2>从记录里，认识自己的饮食习惯</h2>
          {history.length ? (
            <>
              <div className={s.threeCol}>
                {(["早餐", "午餐", "晚餐"] as Meal[]).map((m) => (
                  <div key={m}>
                    <span className={s.metricLabel}>{m}记录</span>
                    <p className={s.metricValue}>
                      {history.filter((r) => r.meal === m).length}
                      <small>次</small>
                    </p>
                  </div>
                ))}
              </div>
              <h3>常去的就餐地点</h3>
              {Object.entries(
                history.reduce<Record<string, number>>((a, r) => {
                  const p = r.place || "未填写地点";
                  a[p] = (a[p] ?? 0) + 1;
                  return a;
                }, {}),
              )
                .sort((a, b) => b[1] - a[1])
                .map(([p, n]) => (
                  <div className={s.listLine} key={p}>
                    <ForkKnife size={20} />
                    <div>{p}</div>
                    <Badge>{n} 次</Badge>
                  </div>
                ))}
              <Link to="/settings" className={s.textButton}>
                修改我的饮食偏好 <ArrowUpRight size={16} />
              </Link>
            </>
          ) : (
            <Empty title="从第一份三餐记录开始" />
          )}
        </Card>
      )}
    </>
  );
}
