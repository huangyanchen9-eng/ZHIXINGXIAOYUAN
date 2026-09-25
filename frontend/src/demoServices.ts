import { profiles } from "./seed";
import { makeStore, uid } from "./domain";
import type { Profile, UserData } from "./types";
const USERS = "zhixing:profiles",
  SESSION = "zhixing:session";
const delay = () => new Promise((r) => setTimeout(r, 240));
export const authService = {
  async list(): Promise<Profile[]> {
    try {
      const saved = JSON.parse(localStorage.getItem(USERS) || "[]");
      return [...profiles, ...(Array.isArray(saved) ? saved : [])];
    } catch {
      return profiles;
    }
  },
  async session(): Promise<Profile | null> {
    const id = sessionStorage.getItem(SESSION);
    return (await this.list()).find((x) => x.id === id) ?? null;
  },
  async enter(id: string) {
    const p = (await this.list()).find((x) => x.id === id);
    if (!p) throw Error("找不到此演示资料，请重新选择");
    sessionStorage.setItem(SESSION, p.id);
    return p;
  },
  async login(studentId: string, _password: string, fail = false) {
    await delay();
    if (fail) throw Error("模拟登录失败，请重试或进入演示体验");
    const p = (await this.list()).find((x) => x.studentId === studentId.trim());
    if (!p) throw Error("未找到此演示资料，可先填写注册表单");
    return this.enter(p.id);
  },
  async register(input: Omit<Profile, "id">, _password: string, fail = false) {
    await delay();
    if (fail) throw Error("模拟注册失败，请稍后重试");
    if ((await this.list()).some((x) => x.studentId === input.studentId.trim()))
      throw Error("此学号已有本地演示资料");
    const p = {
      ...input,
      studentId: input.studentId.trim(),
      name: input.name.trim(),
      id: uid(),
    };
    const saved = (await this.list()).filter(
      (x) => !profiles.some((s) => s.id === x.id),
    );
    localStorage.setItem(USERS, JSON.stringify([...saved, p]));
    return this.enter(p.id);
  },
  async update(profile: Profile) {
    const all = await this.list();
    const overrides = all.filter(
      (x) => x.id !== profile.id && !profiles.some((p) => p.id === x.id),
    );
    if (profiles.some((p) => p.id === profile.id)) {
      localStorage.setItem(
        "zhixing:profile:" + profile.id,
        JSON.stringify(profile),
      );
    } else localStorage.setItem(USERS, JSON.stringify([...overrides, profile]));
    return profile;
  },
  async getProfile(p: Profile) {
    try {
      return (
        JSON.parse(localStorage.getItem("zhixing:profile:" + p.id) || "null") ??
        p
      );
    } catch {
      return p;
    }
  },
  async changePassword(_old: string, _next: string, fail = false) {
    await delay();
    if (fail) throw Error("模拟原密码验证失败");
    return true;
  },
  async logout() {
    sessionStorage.removeItem(SESSION);
  },
};
export const dataService = {
  async read(id: string) {
    return makeStore(localStorage).read(id);
  },
  async write(id: string, data: UserData) {
    makeStore(localStorage).write(id, data);
  },
};
