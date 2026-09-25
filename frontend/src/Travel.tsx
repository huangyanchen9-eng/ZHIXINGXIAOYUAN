import { useRouting, CampusDiagram } from "./CampusRouting";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  MapTrifold,
  NavigationArrow,
  ArrowDown,
  ArrowUp,
  Trash,
  Plus,
  ArrowRight,
} from "@phosphor-icons/react";
import { useApp } from "./store";
import { PageHead, Card, Field, Badge, Empty } from "./ui";
import { mapConfigured, loadMap, campusCenter, locate } from "./mapService";
import type { Place, RouteResult } from "./types";
import { uid, minutes, clock, courseForDestination } from "./domain";
import { today } from "./seed";
import s from "./App.module.css";
function MapView({
  route,
  from,
  to,
}: {
  route?: RouteResult | null;
  from?: Place | null;
  to?: Place | null;
}) {
  const el = useRef<HTMLDivElement>(null),
    map = useRef<any>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!mapConfigured) return;
    let active = true;
    void (async () => {
      try {
        const A = await loadMap();
        if (!active) return;
        const c = await campusCenter();
        if (!active) return;
        map.current = new A.Map(el.current, {
          zoom: 16,
          center: c.position,
          viewMode: "2D",
        });
        setReady(true);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
      map.current?.destroy();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    const A = window.AMap,
      m = map.current;
    m.clearMap();
    [from, to]
      .filter(Boolean)
      .forEach((p: any) =>
        m.add(new A.Marker({ position: p.position, title: p.name })),
      );
    if (route?.path.length)
      m.add(
        new A.Polyline({
          path: route.path,
          strokeColor: "#1473c9",
          strokeWeight: 6,
          showDir: true,
        }),
      );
    if (from || to) m.setFitView(null, false, [65, 45, 65, 45], 17);
  }, [ready, route, from, to]);
  return (
    <div className={s.mapPanel}>
      <div ref={el} className={s.mapCanvas} />
      {(!mapConfigured || error) && (
        <div className={s.mapEmpty}>
          <MapTrifold size={50} weight="duotone" />
          <h3>{mapConfigured ? "地图暂时无法载入" : "连接你的真实校园地图"}</h3>
          <p>
            {error ||
              "配置高德 Key 后，这里会显示大连海事大学真实地图与道路。不会使用虚构地图或路线。"}
          </p>
          <p>详见 frontend / README.md</p>
        </div>
      )}
      {mapConfigured && !ready && !error && (
        <div className={s.mapEmpty}>正在载入真实地图…</div>
      )}
      <div className={s.mapLegend}>
        大连海事大学 · 凌水校园范围 / 实际路线以地图服务为准
      </div>
    </div>
  );
}
function PlaceInput({
  label,
  value,
  onChange,
  initial = "",
  searchPlaces,
}: {
  label: string;
  value: Place | null;
  onChange: (v: Place | null) => void;
  initial?: string;
  searchPlaces: (q: string) => Promise<Place[]>;
}) {
  const [query, setQuery] = useState(value?.name ?? initial),
    [items, setItems] = useState<Place[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const request = useRef(0);
  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);
  return (
    <div>
      <Field label={label}>
        <div className={s.buttonRow} style={{ flexWrap: "nowrap" }}>
          <input
            value={query}
            placeholder="输入具体校园地点"
            onChange={(e) => {
              setQuery(e.target.value);
              onChange(null);
              request.current++;
              setItems([]);
            }}
          />
          <button
            className={s.secondary}
            disabled={busy || !query.trim()}
            onClick={async () => {
              const id = ++request.current;
              setBusy(true);
              setError("");
              try {
                const result = await searchPlaces(query);
                if (request.current === id) {
                  setItems(result);
                  if (!result.length)
                    setError("没有匹配地点，请换一个具体名称");
                }
              } catch (e) {
                if (request.current === id) setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "…" : "搜索"}
          </button>
        </div>
      </Field>
      {value && <Badge>已选：{value.name}</Badge>}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <div className={s.searchResults}>
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              onChange(p);
              setQuery(p.name);
              setItems([]);
            }}
          >
            <strong>{p.name}</strong>
            <small>{p.address}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
export function Travel() {
  const routing = useRouting();
  const { searchPlaces, getRoute } = routing;
  const [params] = useSearchParams(),
    { data, update, notify } = useApp();
  const [from, setFrom] = useState<Place | null>(null),
    [to, setTo] = useState<Place | null>(null),
    [mode, setMode] = useState(data!.preferences.modes[0] ?? "步行"),
    [weather, setWeather] = useState("晴朗"),
    [traffic, setTraffic] = useState("畅通"),
    [depart, setDepart] = useState("08:00"),
    [route, setRoute] = useState<RouteResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const version = useRef(0);
  useEffect(() => {
    setFrom(null);
    setTo(null);
  }, [routing.provider, routing.graph]);
  useEffect(() => {
    setRoute(null);
    version.current++;
  }, [from, to, mode, routing.provider, routing.graph, routing.allowSample]);
  const course = courseForDestination(
    data!.records,
    to?.name ?? "",
    today,
    data!.preferences.termStart,
    depart,
  );
  return (
    <>
      <PageHead
        eyebrow="GO EXPLORE / 校园出行"
        title="下一站，去你想去的地方"
        description="校园独立路网：按登记道路规划出行，无需高德充值。"
        action={
          <Link className={s.secondary} to="/planner">
            多任务行程 <ArrowRight size={17} />
          </Link>
        }
      />
      {routing.controls}
      <div className={s.mapLayout}>
        <Card>
          <PlaceInput
            key={"place-0" + routing.provider + JSON.stringify(routing.graph)}
            searchPlaces={searchPlaces}
            label="出发地点"
            value={from}
            onChange={setFrom}
            initial={params.get("from") ?? ""}
          />
          {routing.provider === "amap" && (
            <button
              className={s.textButton}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setFrom(await locate());
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <NavigationArrow size={15} />
              使用当前位置
            </button>
          )}
          <PlaceInput
            key={"place-1" + routing.provider + JSON.stringify(routing.graph)}
            searchPlaces={searchPlaces}
            label="目的地点"
            value={to}
            onChange={setTo}
            initial={params.get("to") ?? ""}
          />
          <div className={s.formGrid}>
            <Field label="出行方式">
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                {["步行", "骑行", "跑步"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="出发时间">
              <input
                type="time"
                value={depart}
                onChange={(e) => setDepart(e.target.value)}
              />
            </Field>
            <Field label="天气情景">
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
              >
                {["晴朗", "多云", "小雨", "大雨"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="拥堵情景">
              <select
                value={traffic}
                onChange={(e) => setTraffic(e.target.value)}
              >
                {["畅通", "一般", "拥堵"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>
          <button
            className={`${s.primary} ${s.full}`}
            disabled={busy || !from || !to || !depart}
            onClick={async () => {
              const v = version.current;
              setBusy(true);
              setError("");
              setRoute(null);
              try {
                const r = await getRoute(from!, to!, mode);
                if (v === version.current) setRoute(r);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "正在计算路线…" : "规划路线"}
          </button>
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          <p className={s.note}>
            天气与拥堵为手选情景，仅生成提示，不修改路线估算时间。跑步按 7 分钟
            / 公里估算。
          </p>
          {route && (
            <div className={s.routeSummary}>
              <h3>
                {Math.ceil(route.seconds / 60)} <small>分钟</small>
              </h3>
              <p>
                {(route.distance / 1000).toFixed(2)} km ·{" "}
                {routing.provider === "campus"
                  ? route.sample
                    ? "示例距离与时间 · 不用于实际导航"
                    : "登记路网 · 时间为估算"
                  : mode === "跑步"
                    ? "配速估算"
                    : "高德路线结果"}
              </p>
              <p>
                预计{" "}
                {minutes(depart) + Math.ceil(route.seconds / 60) >= 1440
                  ? "次日 "
                  : ""}
                {clock(minutes(depart) + Math.ceil(route.seconds / 60))} 到达
              </p>
              {course && (
                <p>
                  课程 {course.start} 开始，建议{" "}
                  {minutes(course.start) -
                    Math.ceil(route.seconds / 60) -
                    data!.preferences.lead <
                  0
                    ? "前一天 "
                    : ""}
                  {clock(
                    minutes(course.start) -
                      Math.ceil(route.seconds / 60) -
                      data!.preferences.lead,
                  )}{" "}
                  出发
                </p>
              )}
              <p>
                {weather.includes("雨")
                  ? "雨天请留意湿滑道路，预留更多出行时间。"
                  : "享受这段路，也留意沿途安全。"}
                {traffic === "拥堵" ? " 人多时建议提前出发。" : ""}
              </p>
              <button
                className={s.textButton}
                onClick={async () => {
                  await update((d) => ({
                    ...d,
                    records: [
                      ...d.records,
                      {
                        id: uid(),
                        kind: "task",
                        date: today,
                        title: `${mode}前往${to!.name}`,
                        start: depart,
                        duration: Math.ceil(route.seconds / 60),
                        place: to!.name,
                        distance: route.distance / 1000,
                        mode,
                        source: route.sample ? "示例" : "地图",
                        note:
                          routing.provider === "campus"
                            ? route.sample
                              ? "校园路网预演，位置与距离待核实"
                              : "按录入者核实的校园路网估算"
                            : undefined,
                        done: false,
                      },
                    ],
                  }));
                  notify("路线已加入今日待办");
                }}
              >
                加入今日安排
              </button>
            </div>
          )}
        </Card>
        <div>
          {routing.provider === "campus" ? (
            <CampusDiagram
              graph={routing.graph}
              route={route}
              from={from}
              to={to}
            />
          ) : (
            <MapView route={route} from={from} to={to} />
          )}
          {route && (
            <Card>
              <h2>路线详情</h2>
              <ol className={s.routeSteps}>
                {route.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
interface Stop {
  id: string;
  title: string;
  place: string;
  duration: number;
}
export function Planner() {
  const routing = useRouting();
  const { searchPlaces, getRoute, resolvePlace } = routing;
  const [params] = useSearchParams(),
    { data, update, notify } = useApp();
  const [stops, setStops] = useState<Stop[]>(() =>
    params.get("meal")
      ? [
          {
            id: uid(),
            title: params.get("food") ?? "用餐",
            place: params.get("meal")!,
            duration: Number(params.get("duration")) || 25,
          },
          ...(params.get("to")
            ? [
                {
                  id: uid(),
                  title: "上课",
                  place: params.get("to")!,
                  duration: 40,
                },
              ]
            : []),
        ]
      : [
          { id: uid(), title: "还书", place: "图书馆", duration: 5 },
          { id: uid(), title: "午餐", place: "中心食堂", duration: 25 },
        ],
  );
  const [origin, setOrigin] = useState<Place | null>(null),
    [date, setDate] = useState(params.get("date") ?? today),
    [time, setTime] = useState(params.get("time") ?? "12:00"),
    [mode, setMode] = useState(data!.preferences.modes[0] ?? "步行"),
    [bias, setBias] = useState(0.3),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [storedResult, setResult] = useState<{
      key: string;
      routes: RouteResult[];
      places: Place[];
    } | null>(null),
    [demo, setDemo] = useState(false);
  const planKey = JSON.stringify([
    stops,
    origin,
    mode,
    date,
    time,
    routing.provider,
    routing.graph,
    routing.allowSample,
  ]);
  const result = storedResult?.key === planKey ? storedResult : null;
  const generation = useRef(0);
  useEffect(() => {
    setOrigin(null);
  }, [routing.provider, routing.graph]);
  useEffect(() => {
    setResult(null);
    generation.current++;
  }, [
    stops,
    origin,
    mode,
    date,
    time,
    routing.provider,
    routing.graph,
    routing.allowSample,
  ]);
  const patch = (id: string, key: keyof Stop, value: string | number) =>
    setStops(stops.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
  const move = (i: number, n: number) => {
    if (i + n < 0 || i + n >= stops.length) return;
    const next = [...stops];
    [next[i], next[i + n]] = [next[i + n], next[i]];
    setStops(next);
  };
  let elapsed = 0;
  return (
    <>
      <PageHead
        eyebrow="MAKE A PLAN / 多任务行程"
        title="想做的事，顺路一起完成"
        description="为每一站留出时间，按所选路网逐段计算。智能优化仍为独立演示。"
      />
      {routing.controls}
      <Card>
        <div className={s.formGrid}>
          <PlaceInput
            key={"place-2" + routing.provider + JSON.stringify(routing.graph)}
            searchPlaces={searchPlaces}
            label="行程起点"
            value={origin}
            onChange={setOrigin}
            initial={params.get("from") ?? ""}
          />
          <Field label="行程日期">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="开始时间">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
          <Field label="出行方式">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {["步行", "骑行", "跑步"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
        </div>
        <h2 style={{ marginBottom: 15 }}>我的任务清单</h2>
        {stops.map((stop, i) => (
          <div className={s.plannerRow} key={stop.id}>
            <span className={s.plannerNumber}>{i + 1}</span>
            <input
              aria-label={`任务${i + 1}名称`}
              list="activities"
              value={stop.title}
              onChange={(e) => patch(stop.id, "title", e.target.value)}
            />
            <input
              aria-label={`任务${i + 1}地点`}
              value={stop.place}
              placeholder="地图中的完整地点名"
              onChange={(e) => patch(stop.id, "place", e.target.value)}
            />
            <input
              aria-label={`任务${i + 1}停留分钟`}
              type="number"
              min="1"
              max="720"
              value={stop.duration}
              onChange={(e) => patch(stop.id, "duration", +e.target.value)}
            />
            <div className={s.plannerActions}>
              <button
                className={s.iconButton}
                disabled={i === 0}
                aria-label="上移任务"
                onClick={() => move(i, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                className={s.iconButton}
                disabled={i === stops.length - 1}
                aria-label="下移任务"
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                className={s.iconButton}
                aria-label="删除任务"
                onClick={() => setStops(stops.filter((x) => x.id !== stop.id))}
              >
                <Trash size={16} />
              </button>
            </div>
          </div>
        ))}
        <datalist id="activities">
          {[
            "上课",
            "早餐",
            "午餐",
            "晚餐",
            "还书",
            "取书",
            "购物",
            "锻炼",
            "休息",
            "洗澡",
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </datalist>
        <div className={s.buttonRow}>
          <button
            className={s.secondary}
            onClick={() =>
              setStops([
                ...stops,
                { id: uid(), title: "", place: "", duration: 20 },
              ])
            }
          >
            <Plus size={16} />
            添加任务
          </button>
          <button
            className={s.textButton}
            onClick={() => {
              const items = data!.records.filter(
                (r) =>
                  r.date === date &&
                  (r.kind === "task" || (r.kind === "meal" && r.planned)) &&
                  r.place,
              );
              setStops([
                ...stops,
                ...items.map((r) => ({
                  id: uid(),
                  title: r.title,
                  place: r.place!,
                  duration: r.duration ?? 20,
                })),
              ]);
              notify(
                items.length
                  ? `已导入 ${items.length} 项，请检查是否重复`
                  : "当日没有可导入的地点任务",
              );
            }}
          >
            从当天安排导入
          </button>
        </div>
        <p className={s.note}>
          每项任务的数字为停留分钟。地点不明确时请先到校园导航检索完整名称；请先核对路网地点与道路数据。
        </p>
        <Field
          label={`健康偏好 ${(bias * 100).toFixed(0)}%（供后续智能优化服务使用）`}
        >
          <input
            type="range"
            min="0"
            max="1"
            step=".1"
            value={bias}
            onChange={(e) => setBias(+e.target.value)}
          />
        </Field>
        <div className={s.buttonRow}>
          <button
            className={s.primary}
            disabled={busy}
            onClick={async () => {
              setError("");
              setResult(null);
              if (
                !origin ||
                !date ||
                !time ||
                !stops.length ||
                stops.some(
                  (x) =>
                    !x.title.trim() ||
                    !x.place.trim() ||
                    x.duration <= 0 ||
                    x.duration > 720,
                )
              ) {
                setError(
                  "请选择起点、日期与时间，并填写每项任务的名称、具体地点和 1—720 分钟停留时长",
                );
                return;
              }
              const version = generation.current;
              setBusy(true);
              try {
                const places: Place[] = [],
                  routes: RouteResult[] = [];
                let previous = origin;
                for (const stop of stops) {
                  if (generation.current !== version) return;
                  const place = await resolvePlace(stop.place);
                  if (generation.current !== version) return;
                  routes.push(await getRoute(previous, place, mode));
                  if (generation.current !== version) return;
                  places.push(place);
                  previous = place;
                }
                if (generation.current === version)
                  setResult({ places, routes, key: planKey });
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "逐段计算路线…" : "按当前顺序规划"}
          </button>
          <button className={s.secondary} onClick={() => setDemo(!demo)}>
            查看智能优化演示
          </button>
        </div>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
      </Card>
      {demo && (
        <Card className={s.settingsGroup}>
          <Badge tone="orange">固定场景 · DQN 演示</Badge>
          <h2>理解“顺路”的价值</h2>
          <p className={s.muted}>
            示例任务：宿舍出发，去食堂、图书馆和教学楼。演示把有上课时间约束的任务优先安排，将就餐并入途经任务；健康偏好值为{" "}
            {bias.toFixed(1)}
            。这里只说明优化交互，不代表已运行模型或获取实际节省时间。
          </p>
          <div className={s.twoCol}>
            <div>输入顺序：图书馆 → 食堂 → 教学楼</div>
            <div>示例输出：食堂 → 教学楼 → 图书馆</div>
          </div>
        </Card>
      )}
      {result && (
        <Card className={s.settingsGroup}>
          <h2>这趟行程，安排好了</h2>
          {result.routes.some((r) => r.sample) && (
            <p className={s.notice}>
              示例预演：包含待核实的校园位置、距离或道路，不能用于实际导航。
            </p>
          )}
          {result.routes.map((route, i) => {
            const arrival =
              minutes(time) + elapsed + Math.ceil(route.seconds / 60);
            elapsed += Math.ceil(route.seconds / 60) + stops[i].duration;
            return (
              <div className={s.listLine} key={stops[i].id}>
                <span className={s.plannerNumber}>{i + 1}</span>
                <div>
                  <strong>
                    {clock(arrival)} · {stops[i].title}
                  </strong>
                  <small>
                    {result.places[i].name} · 路程{" "}
                    {(route.distance / 1000).toFixed(2)} km /{" "}
                    {Math.ceil(route.seconds / 60)} 分钟 · 停留{" "}
                    {stops[i].duration} 分钟
                  </small>
                  {arrival >= 1440 && <small>次日或更晚到达</small>}
                </div>
              </div>
            );
          })}
          <p className={s.notice}>
            总耗时 {elapsed} 分钟（含停留），预计{" "}
            {clock(minutes(time) + elapsed)} 完成。普通规划保持用户顺序，未进行
            DQN 优化。
          </p>
          <button
            className={s.primary}
            onClick={async () => {
              let acc = 0;
              const records = stops.map((stop, i) => {
                acc += Math.ceil(result.routes[i].seconds / 60);
                const total = minutes(time) + acc;
                const dateObj = new Date(date + "T12:00");
                dateObj.setDate(dateObj.getDate() + Math.floor(total / 1440));
                const record = {
                  id: uid(),
                  kind: "task" as const,
                  date:
                    dateObj.getFullYear() +
                    "-" +
                    String(dateObj.getMonth() + 1).padStart(2, "0") +
                    "-" +
                    String(dateObj.getDate()).padStart(2, "0"),
                  title: stop.title,
                  start: clock(total),
                  place: result.places[i].name,
                  duration: stop.duration,
                  mode,
                  distance: result.routes[i].distance / 1000,
                  done: false,
                  source: result.routes[i].sample
                    ? ("示例" as const)
                    : ("地图" as const),
                  note: result.routes[i].sample
                    ? "校园路网预演，距离与道路待核实"
                    : undefined,
                };
                acc += stop.duration;
                return record;
              });
              await update((d) => ({
                ...d,
                records: [...d.records, ...records],
              }));
              notify("行程已加入当天安排");
              setResult(null);
            }}
          >
            保存到今日安排
          </button>
        </Card>
      )}
    </>
  );
}
