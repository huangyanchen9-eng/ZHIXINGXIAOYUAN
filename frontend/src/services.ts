import {
  authService as demoAuth,
  dataService as demoData,
} from "./demoServices";
import type { Profile, UserData } from "./types";
const MODE = "zhixing:mode";
let csrf = "",
  activeId = "";
const revisions = new Map<string, number>();
export const isDemo = () => sessionStorage.getItem(MODE) === "demo";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request(path: string, method = "GET", body?: unknown) {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        "X-Zhixing-Client": "web",
        ...(activeId ? { "X-User-Id": activeId } : {}),
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError("无法连接后端，请确认后端已启动后重试", 0);
  }
  const result = await response.json().catch(() => null);
  if (
    response.status === 401 &&
    activeId &&
    !["/auth/login", "/auth/register"].includes(path)
  ) {
    activeId = "";
    csrf = "";
    revisions.clear();
    window.dispatchEvent(new Event("zhixing:session-expired"));
  }
  if (!response.ok)
    throw new ApiError(
      result?.error?.message ?? "请求失败，请重试",
      response.status,
    );
  if (!result) throw new ApiError("后端返回格式异常，请检查服务配置", 0);
  return result;
}
function accept(result: { profile: Profile; csrfToken: string }) {
  csrf = result.csrfToken;
  activeId = result.profile.id;
  revisions.clear();
  sessionStorage.removeItem(MODE);
  sessionStorage.removeItem("zhixing:session");
  return result.profile;
}
export const authService = {
  async session(): Promise<Profile | null> {
    if (isDemo()) return demoAuth.session();
    try {
      return accept(await request("/auth/session"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  async enter(id: string) {
    if (activeId) await this.logout();
    const p = await demoAuth.enter(id);
    sessionStorage.setItem(MODE, "demo");
    return p;
  },
  async login(studentId: string, password: string, _fail = false) {
    return accept(
      await request("/auth/login", "POST", { studentId, password }),
    );
  },
  async register(input: Omit<Profile, "id">, password: string, _fail = false) {
    return accept(
      await request("/auth/register", "POST", { ...input, password }),
    );
  },
  async getProfile(p: Profile) {
    return isDemo() ? demoAuth.getProfile(p) : p;
  },
  async update(p: Profile): Promise<Profile> {
    if (isDemo()) return demoAuth.update(p);
    const { name, grade, major, gender } = p;
    return (await request("/profile", "PATCH", { name, grade, major, gender }))
      .profile;
  },
  async changePassword(oldPassword: string, newPassword: string, fail = false) {
    if (isDemo())
      return demoAuth.changePassword(oldPassword, newPassword, fail);
    const r = await request("/auth/password", "POST", {
      oldPassword,
      newPassword,
    });
    csrf = r.csrfToken;
    return true;
  },
  async logout() {
    if (isDemo()) await demoAuth.logout();
    else
      try {
        await request("/auth/logout", "POST");
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 401)) throw e;
      }
    sessionStorage.removeItem(MODE);
    activeId = "";
    csrf = "";
    revisions.clear();
  },
};
export const dataService = {
  async read(id: string): Promise<UserData> {
    if (isDemo()) return demoData.read(id);
    const r = await request("/state");
    if (r.userId !== id) throw Error("当前账号已改变，请刷新页面");
    revisions.set(id, r.revision);
    return r.data;
  },
  async write(id: string, data: UserData) {
    if (isDemo()) return demoData.write(id, data);
    if (id !== activeId || !revisions.has(id))
      throw Error("会话已改变，请重新登录");
    const r = await request("/state", "PUT", {
      revision: revisions.get(id),
      data,
    });
    if (r.userId !== id) throw Error("账号已改变，请刷新");
    revisions.set(id, r.revision);
  },
};
