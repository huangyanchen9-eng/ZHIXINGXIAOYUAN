import { afterEach, describe, it, expect, vi } from "vitest";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});
const a = {
    id: "a",
    name: "起点",
    address: "",
    position: [121, 38] as [number, number],
  },
  b = {
    id: "b",
    name: "终点",
    address: "",
    position: [121.01, 38.01] as [number, number],
  };
async function setup(status: string, result: any) {
  vi.stubEnv("VITE_AMAP_KEY", "unit-test-placeholder");
  const SDK = {
    Walking: class {
      search(_a: any, _b: any, cb: any) {
        cb(status, result);
      }
    },
    Riding: class {
      search(_a: any, _b: any, cb: any) {
        cb(status, result);
      }
    },
  };
  vi.stubGlobal("window", { AMap: SDK });
  vi.stubGlobal("location", { origin: "http://localhost:5173" });
  vi.stubGlobal("document", {
    createElement: () => ({}),
    head: { appendChild: (script: any) => script.onload() },
  });
  return import("./mapService");
}
describe("真实地图适配层", () => {
  it("步行与骑行解析真实 SDK 返回路径", async () => {
    const service = await setup("complete", {
      routes: [
        {
          distance: 1000,
          time: 600,
          rides: [
            {
              instruction: "沿道路前进",
              path: [
                { lng: 121, lat: 38 },
                { lng: 121.01, lat: 38.01 },
              ],
            },
          ],
        },
      ],
    });
    expect(await service.getRoute(a, b, "骑行")).toMatchObject({
      distance: 1000,
      seconds: 600,
      path: [
        [121, 38],
        [121.01, 38.01],
      ],
    });
    expect((await service.getRoute(a, b, "跑步")).seconds).toBe(420);
  });
  it("不可达时不伪造路线", async () => {
    const service = await setup("no_data", {});
    await expect(service.getRoute(a, b, "步行")).rejects.toThrow(
      "未获得可用路线",
    );
  });
  it("服务未返回道路时不绘制直线", async () => {
    const service = await setup("complete", {
      routes: [{ distance: 100, time: 60, steps: [] }],
    });
    await expect(service.getRoute(a, b, "步行")).rejects.toThrow(
      "有效道路路径",
    );
  });
});
