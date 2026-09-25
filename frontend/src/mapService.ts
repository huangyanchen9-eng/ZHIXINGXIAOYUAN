import type { Place, RouteResult } from "./types";
declare global {
  interface Window {
    __CAMPUS_CONFIG__?: {amapKey?:string};
    AMap: any;
    _AMapSecurityConfig: { serviceHost: string };
  }
}
const key = (typeof window!=='undefined'?window.__CAMPUS_CONFIG__?.amapKey:undefined) || import.meta.env.VITE_AMAP_KEY;
export const mapConfigured = Boolean(key);
let sdkPromise: Promise<any> | null = null;
export function loadMap(): Promise<any> {
  if (!key)
    return Promise.reject(
      Error("尚未配置高德地图 Key。请按 README 在 .env.local 中填写并重启。"),
    );
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    window._AMapSecurityConfig = {
      serviceHost: location.origin + "/_AMapService",
    };
    const script = document.createElement("script");
    const timer = setTimeout(
      () => reject(Error("地图加载超时，请检查网络或 Key 配置后刷新")),
      18000,
    );
    script.src =
      "https://webapi.amap.com/maps?v=2.0&key=" +
      encodeURIComponent(key) +
      "&plugin=AMap.PlaceSearch,AMap.Walking,AMap.Riding,AMap.Geolocation";
    script.onload = () => {
      clearTimeout(timer);
      window.AMap ? resolve(window.AMap) : reject(Error("地图 SDK 初始化失败"));
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(Error("地图服务不可用，请检查网络后刷新"));
    };
    document.head.appendChild(script);
  }).catch((e) => {
    sdkPromise = null;
    throw e;
  });
  return sdkPromise;
}
const toPlace = (p: any): Place => ({
  id: p.id ?? p.name,
  name: p.name,
  address: typeof p.address === "string" ? p.address : "大连海事大学",
  position: [p.location.lng, p.location.lat],
});
function searchRaw(
  A: any,
  query: string,
  center?: [number, number],
): Promise<Place[]> {
  return new Promise((resolve, reject) => {
    const search = new A.PlaceSearch({
      city: "大连",
      citylimit: true,
      pageSize: 15,
    });
    const cb = (status: string, result: any) => {
      clearTimeout(timer);
      if (status === "complete")
        resolve(
          (result.poiList?.pois ?? [])
            .filter((p: any) => p.location)
            .map(toPlace),
        );
      else if (status === "no_data") resolve([]);
      else
        reject(
          Error("地点查询失败：" + (result.info ?? "请检查地图凭据与网络")),
        );
    };
    const timer = setTimeout(
      () => reject(Error("地点查询超时，请重试")),
      15000,
    );
    if (center) search.searchNearBy(query, center, 3500, cb);
    else search.search(query, cb);
  });
}
let campus: Place | undefined;
export async function campusCenter() {
  if (campus) return campus;
  const A = await loadMap();
  const places = await searchRaw(A, "大连海事大学");
  campus =
    places.find((p) => p.name === "大连海事大学") ??
    places.find((p) => p.name.includes("大连海事大学"));
  if (!campus) throw Error("未查到大连海事大学，请检查地图服务");
  return campus;
}
export async function searchPlaces(query: string) {
  if (!query.trim()) return [];
  const A = await loadMap(),
    center = await campusCenter();
  return searchRaw(A, query.trim(), center.position);
}
export async function resolvePlace(query: string) {
  const places = await searchPlaces(query);
  if (!places.length) throw Error(`没有找到“${query}”，请使用校园具体建筑名称`);
  const exact = places.filter(
    (p) =>
      p.name === query ||
      p.name === "大连海事大学" + query ||
      p.name === "大连海事大学-" + query,
  );
  if (exact.length === 1) return exact[0];
  if (places.length === 1) return places[0];
  throw Error(
    `“${query}”有多个结果，请在校园导航中确认具体地点后，使用其完整名称`,
  );
}
export async function getRoute(
  from: Place,
  to: Place,
  mode: string,
): Promise<RouteResult> {
  if (from.id === to.id)
    return {
      distance: 0,
      seconds: 0,
      path: [from.position],
      steps: ["已在目的地，无需移动"],
      mode,
    };
  const A = await loadMap();
  return new Promise((resolve, reject) => {
    const service = mode === "骑行" ? new A.Riding() : new A.Walking();
    const timer = setTimeout(
      () => reject(Error("路线查询超时，请重试")),
      18000,
    );
    service.search(
      from.position,
      to.position,
      (status: string, result: any) => {
        clearTimeout(timer);
        if (status !== "complete" || !result.routes?.[0])
          return reject(Error("未获得可用路线，请修改起终点或出行方式后重试"));
        const route = result.routes[0];
        const steps = route.steps ?? route.rides ?? [];
        const path = steps.flatMap((step: any) =>
          (step.path ?? []).map((p: any) => [p.lng, p.lat]),
        );
        if (!path.length && route.distance > 0)
          return reject(Error("地图未返回有效道路路径，无法显示路线"));
        resolve({
          distance: route.distance,
          seconds:
            mode === "跑步"
              ? Math.round((route.distance / 1000) * 7 * 60)
              : route.time,
          path,
          steps: steps.map((x: any) => x.instruction ?? x.road ?? "沿道路前进"),
          mode,
        });
      },
    );
  });
}
export async function locate(): Promise<Place> {
  const A = await loadMap();
  return new Promise((resolve, reject) => {
    new A.Geolocation({
      enableHighAccuracy: true,
      timeout: 12000,
      convert: true,
    }).getCurrentPosition((status: string, result: any) => {
      if (status === "complete")
        resolve({
          id: "current",
          name: "我的当前位置",
          address: "浏览器定位",
          position: [result.position.lng, result.position.lat],
        });
      else reject(Error("定位失败或未获授权，请手动选择校园起点"));
    });
  });
}
