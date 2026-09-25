import { describe, it, expect } from "vitest";
import { routeGraph, validateGraph } from "./campusGraph";
const graph: any = {
  version: 1,
  nodes: [
    { id: "a", name: "起点", campus: "凌水", x: 40, y: 60 },
    { id: "b", name: "中转", campus: "凌水", x: 50, y: 60 },
    { id: "c", name: "终点", campus: "凌水", x: 80, y: 90 },
  ],
  edges: [
    {
      id: "ab",
      from: "a",
      to: "b",
      meters: 100,
      modes: ["步行"],
      verified: false,
    },
    {
      id: "bc",
      from: "b",
      to: "c",
      meters: 200,
      modes: ["步行"],
      verified: false,
    },
    {
      id: "ac",
      from: "a",
      to: "c",
      meters: 800,
      modes: ["步行"],
      verified: false,
    },
  ],
};
describe("校园独立路网", () => {
  it("默认拒绝待核实道路，不以直线补齐", () =>
    expect(() => routeGraph(graph, "a", "c", "步行", false)).toThrow());
  it("示例模式沿登记道路求最短路，距离不取图面比例", () => {
    expect(validateGraph(graph)).toBe(graph);
    const r = routeGraph(graph, "a", "c", "步行", true);
    expect(r.distance).toBe(300);
    expect(r.path).toEqual([
      [40, 60],
      [50, 60],
      [80, 90],
    ]);
    expect(r.sample).toBe(true);
  });
  it("尊重关闭和交通方式限制", () => {
    expect(() => routeGraph(graph, "a", "c", "骑行", true)).toThrow();
    const closed = structuredClone(graph);
    closed.edges.forEach((e: any) => (e.closed = true));
    expect(() => routeGraph(closed, "a", "c", "步行", true)).toThrow();
  });
  it("拒绝悬空道路、重复地点和假核验声明", () => {
    const bad = structuredClone(graph);
    bad.edges[0].to = "missing";
    expect(() => validateGraph(bad)).toThrow();
    bad.edges[0].to = "b";
    bad.nodes.push(bad.nodes[0]);
    expect(() => validateGraph(bad)).toThrow();
    const verified = structuredClone(graph);
    verified.edges[0].verified = true;
    expect(() => validateGraph(verified)).toThrow();
  });
});
it('已登记核实的节点与道路可以规划，且不标为示例',()=>{const verified=structuredClone(graph);verified.nodes.forEach((n:any)=>{n.verified=true;n.evidence='测试用核实依据'});verified.edges.forEach((e:any)=>{e.verified=true;e.evidence='测试用核实依据'});const r=routeGraph(verified,'a','c','步行');expect(r.sample).toBe(false);expect(r.seconds).toBe(250)});
