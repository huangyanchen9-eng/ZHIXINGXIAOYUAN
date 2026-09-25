import { useState } from "react";
import type { Place, RouteResult } from "./types";
import {
  defaultGraph,
  readGraph,
  saveGraph,
  searchGraph,
  resolveGraph,
  routeGraph,
  validateGraph,
  type CampusGraph,
} from "./campusGraph";
import * as amap from "./mapService";
import { Card, Field } from "./ui";
import { download } from "./domain";
import s from "./App.module.css";
export function useRouting() {
  const [provider, setProvider] = useState("campus"),
    [allowSample, setAllowSample] = useState(false);
  const [initial] = useState(() => {
    try {
      return { graph: readGraph(), error: "" };
    } catch (e) {
      return { graph: defaultGraph, error: (e as Error).message };
    }
  });
  const [graph, setGraph] = useState<CampusGraph>(initial.graph),
    [error, setError] = useState(initial.error),
    [draft, setDraft] = useState(() => JSON.stringify(initial.graph, null, 2));
  const searchPlaces = async (q: string) =>
    provider === "amap" ? amap.searchPlaces(q) : searchGraph(graph, q);
  const resolvePlace = async (q: string) =>
    provider === "amap" ? amap.resolvePlace(q) : resolveGraph(graph, q);
  const getRoute = async (a: Place, b: Place, m: string) =>
    provider === "amap"
      ? amap.getRoute(a, b, m)
      : routeGraph(graph, a.id, b.id, m, allowSample);
  const controls = (
    <Card className={s.settingsGroup}>
      <Field label="路线来源">
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="campus">校园独立路网 · 无需地图 API</option>
          <option value="amap" disabled={!amap.mapConfigured}>
            高德（可选，需自行确认授权）
          </option>
        </select>
      </Field>
      {provider === "campus" ? (
        <>
          <p className={s.notice}>
            校园示意图，不是地理底图。目前内置地点位置、连线和距离均为待核实样例，不代表海大实际道路。凌水、东山、西山之间尚未登记真实连接。
          </p>
          <label>
            <input
              type="checkbox"
              checked={allowSample}
              onChange={(e) => setAllowSample(e.target.checked)}
            />{" "}
            使用待核实数据预演（不能用于实际导航）
          </label>
          <details style={{ marginTop: 16 }}>
            <summary>编辑校园地点与道路</summary>
            <p>
              保存范围：此浏览器共享路网，不随账号同步。请先导出备份。可以增删地点与道路；只有实际核对后才填写
              verified=true，并在 evidence 记录来源、日期与核对说明。图面 x/y
              仅用于排版，meters 是独立登记的道路长度。
            </p>
            <Field label="校园路网 JSON">
              <textarea
                rows={14}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
              />
            </Field>
            <div className={s.buttonRow}>
              <button
                className={s.primary}
                onClick={() => {
                  try {
                    const next = validateGraph(JSON.parse(draft));
                    saveGraph(next);
                    setGraph(next);
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                保存路网
              </button>
              <button
                className={s.secondary}
                onClick={() =>
                  download("校园路网.json", JSON.stringify(graph, null, 2))
                }
              >
                导出路网
              </button>
              <button
                className={s.secondary}
                onClick={() => {
                  if (confirm("恢复示例将覆盖此浏览器的路网，确认已备份？")) {
                    try {
                      saveGraph(defaultGraph);
                      setGraph(defaultGraph);
                      setDraft(JSON.stringify(defaultGraph, null, 2));
                      setError("");
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }
                }}
              >
                恢复示例路网
              </button>
            </div>
            <p className={s.note}>
              modes 控制步行/骑行/跑步；closed=true 表示封闭；oneWay=true
              表示单向。不连通时不会自动添加道路。
            </p>
          </details>
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
        </>
      ) : (
        <p className={s.notice}>
          仅在你确认高德账户许可及配额适用后使用。切回校园独立路网不会请求高德服务。
        </p>
      )}
    </Card>
  );
  return {
    provider,
    graph,
    allowSample,
    controls,
    searchPlaces,
    resolvePlace,
    getRoute,
  };
}
export function CampusDiagram({
  graph,
  route,
  from,
  to,
}: {
  graph: CampusGraph;
  route?: RouteResult | null;
  from?: Place | null;
  to?: Place | null;
}) {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  return (
    <Card>
      <h2>校园路网示意</h2>
      <p className={s.note}>非地理比例 · 虚线为待核实道路 · 点位可在上方编辑</p>
      <svg
        viewBox="0 0 600 440"
        role="img"
        aria-label="校园道路拓扑示意图，非真实地理地图"
        style={{
          width: "100%",
          height: "auto",
          background: "#edf6ff",
          borderRadius: 16,
        }}
      >
        {graph.edges.map((e) => {
          const a = nodes.get(e.from)!,
            b = nodes.get(e.to)!;
          return (
            <g key={e.id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={e.closed ? "#b9bec5" : "#94b9d8"}
                strokeWidth="4"
                strokeDasharray={e.verified ? "" : "7 6"}
              />
              <title>
                {e.meters}米 ·{" "}
                {e.closed ? "关闭" : e.verified ? "已登记核实" : "示例长度"}
              </title>
            </g>
          );
        })}
        {route && (
          <polyline
            points={route.path.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke="#1473c9"
            strokeWidth="6"
          />
        )}
        {graph.nodes.map((n) => (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r="9"
              fill={
                n.id === from?.id
                  ? "#15946e"
                  : n.id === to?.id
                    ? "#ed9239"
                    : "#1473c9"
              }
            />
            <text
              x={n.x}
              y={n.y - 18}
              textAnchor="middle"
              fontSize="14"
              fill="#123d60"
            >
              {n.name}
            </text>
            <text
              x={n.x}
              y={n.y + 28}
              textAnchor="middle"
              fontSize="11"
              fill="#627c91"
            >
              {n.campus} · {n.verified ? "录入者已核实" : "待核实"}
            </text>
          </g>
        ))}
      </svg>
    </Card>
  );
}
