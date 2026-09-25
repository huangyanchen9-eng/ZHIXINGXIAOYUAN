import type { Place, RouteResult } from "./types";
export type CampusNode = {
  id: string;
  name: string;
  campus: string;
  x: number;
  y: number;
  verified?: boolean;
  evidence?: string;
};
export type CampusEdge = {
  id: string;
  from: string;
  to: string;
  meters: number;
  modes: string[];
  verified: boolean;
  evidence?: string;
  closed?: boolean;
  oneWay?: boolean;
};
export type CampusGraph = {
  version: 1;
  nodes: CampusNode[];
  edges: CampusEdge[];
};
export const defaultGraph: CampusGraph = {
  version: 1,
  nodes: [
    { id: "dorm", name: "示例宿舍", campus: "凌水", x: 90, y: 130 },
    { id: "canteen", name: "中心食堂", campus: "凌水", x: 260, y: 130 },
    { id: "library", name: "图书馆", campus: "凌水", x: 260, y: 310 },
    { id: "class", name: "学汇楼", campus: "凌水", x: 470, y: 310 },
    { id: "east", name: "东山地点（待补充）", campus: "东山", x: 490, y: 100 },
    { id: "west", name: "西山地点（待补充）", campus: "西山", x: 80, y: 330 },
  ],
  edges: [
    {
      id: "d-c",
      from: "dorm",
      to: "canteen",
      meters: 200,
      modes: ["步行", "骑行", "跑步"],
      verified: false,
    },
    {
      id: "c-l",
      from: "canteen",
      to: "library",
      meters: 300,
      modes: ["步行", "跑步"],
      verified: false,
    },
    {
      id: "l-t",
      from: "library",
      to: "class",
      meters: 250,
      modes: ["步行", "骑行", "跑步"],
      verified: false,
    },
    {
      id: "c-t",
      from: "canteen",
      to: "class",
      meters: 700,
      modes: ["步行", "骑行", "跑步"],
      verified: false,
    },
  ],
};
export function validateGraph(value: unknown): CampusGraph {
  const g = value as CampusGraph;
  const fail = () => {
    throw Error("路网格式无效：请检查地点、道路、距离、出行方式和核实依据");
  };
  if (
    !g ||
    g.version !== 1 ||
    !Array.isArray(g.nodes) ||
    !Array.isArray(g.edges) ||
    g.nodes.length > 300 ||
    g.edges.length > 1500
  )
    fail();
  const str = (v: unknown, max = 200) =>
    typeof v === "string" && v.trim().length > 0 && v.length <= max;
  const ids = new Set<string>();
  for (const n of g.nodes) {
    if (
      !n ||
      !str(n.id) ||
      !str(n.name) ||
      !str(n.campus) ||
      !Number.isFinite(n.x) ||
      !Number.isFinite(n.y) ||
      n.x < 30 ||
      n.x > 570 ||
      n.y < 40 ||
      n.y > 400 ||
      ids.has(n.id) ||
      (n.verified !== undefined && typeof n.verified !== "boolean") ||
      (n.verified && !str(n.evidence, 1000))
    )
      fail();
    ids.add(n.id);
  }
  const edgeIds = new Set<string>();
  for (const e of g.edges) {
    if (
      !e ||
      !str(e.id) ||
      edgeIds.has(e.id) ||
      !ids.has(e.from) ||
      !ids.has(e.to) ||
      e.from === e.to ||
      !Number.isFinite(e.meters) ||
      e.meters <= 0 ||
      e.meters > 50000 ||
      !Array.isArray(e.modes) ||
      !e.modes.length ||
      e.modes.some((m) => !["步行", "骑行", "跑步"].includes(m)) ||
      typeof e.verified !== "boolean" ||
      (e.verified && !str(e.evidence, 1000)) ||
      (e.closed !== undefined && typeof e.closed !== "boolean") ||
      (e.oneWay !== undefined && typeof e.oneWay !== "boolean")
    )
      fail();
    edgeIds.add(e.id);
  }
  return g;
}
export function nodePlace(n: CampusNode): Place {
  return {
    id: n.id,
    name: n.name,
    address:
      n.campus + " · " + (n.verified ? "录入者标记已核实" : "待核实示例位置"),
    position: [n.x, n.y],
  };
}
export function searchGraph(g: CampusGraph, q: string) {
  return g.nodes
    .filter((n) => (n.name + n.campus).includes(q.trim()))
    .map(nodePlace);
}
export function resolveGraph(g: CampusGraph, q: string) {
  const results = searchGraph(g, q);
  const exact = results.filter((p) => p.name === q.trim());
  if (exact.length === 1) return exact[0];
  if (results.length === 1) return results[0];
  throw Error(
    results.length
      ? "地点不唯一，请填写完整名称"
      : "校园路网中尚无此地点，请先补充地点数据",
  );
}
export function routeGraph(
  g: CampusGraph,
  from: string,
  to: string,
  mode: string,
  allowSample = false,
): RouteResult {
  validateGraph(g);
  const nodes = new Map(g.nodes.map((n) => [n.id, n]));
  if (!nodes.has(from) || !nodes.has(to))
    throw Error("起终点不在当前校园路网中");
  const eligible = (id: string) => allowSample || nodes.get(id)?.verified;
  if (!eligible(from) || !eligible(to))
    throw Error("起终点尚未核实。请补充核实依据，或显式开启示例预演");
  const distances = new Map(g.nodes.map((n) => [n.id, Infinity]));
  distances.set(from, 0);
  const visited = new Set<string>(),
    prev = new Map<string, { node: string; edge: CampusEdge }>();
  while (visited.size < nodes.size) {
    let current: string | undefined,
      best = Infinity;
    for (const [id, d] of distances)
      if (!visited.has(id) && d < best) {
        current = id;
        best = d;
      }
    if (current === undefined || current === to) break;
    visited.add(current);
    for (const e of g.edges) {
      if (e.closed || !e.modes.includes(mode) || (!allowSample && !e.verified))
        continue;
      const next =
        e.from === current
          ? e.to
          : !e.oneWay && e.to === current
            ? e.from
            : undefined;
      if (!next || !eligible(next)) continue;
      const d = best + e.meters;
      if (d < distances.get(next)!) {
        distances.set(next, d);
        prev.set(next, { node: current, edge: e });
      }
    }
  }
  const distance = distances.get(to)!;
  if (!Number.isFinite(distance))
    throw Error(
      "当前没有可通行的已登记道路；不会用直线补齐。请检查路网、关闭状态和出行方式",
    );
  const ids = [to],
    edges: CampusEdge[] = [];
  let at = to;
  while (at !== from) {
    const step = prev.get(at)!;
    edges.unshift(step.edge);
    ids.unshift(step.node);
    at = step.node;
  }
  const sample =
    ids.some((id) => !nodes.get(id)!.verified) ||
    edges.some((e) => !e.verified);
  return {
    distance,
    seconds: Math.round(
      distance / (mode === "骑行" ? 3.5 : mode === "跑步" ? 1000 / 420 : 1.2),
    ),
    path: ids.map((id) => [nodes.get(id)!.x, nodes.get(id)!.y]),
    steps: edges.length
      ? edges.map(
          (e, i) =>
            nodes.get(ids[i])!.name +
            " → " +
            nodes.get(ids[i + 1])!.name +
            " · 登记长度 " +
            e.meters +
            " 米" +
            (e.verified ? "（录入者已核实）" : "（示例，待核实）"),
        )
      : ["已在目的地"],
    mode,
    sample,
  };
}
const storageKey = "zhixing:campus-graph:v1";
export function readGraph() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return defaultGraph;
  try {
    return validateGraph(JSON.parse(saved));
  } catch {
    throw Error("此浏览器路网损坏，请在路网编辑面板修复或恢复示例");
  }
}
export function saveGraph(g: CampusGraph) {
  localStorage.setItem(storageKey, JSON.stringify(validateGraph(g)));
}
