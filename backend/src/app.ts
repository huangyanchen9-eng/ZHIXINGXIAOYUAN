import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import {registerHosting} from './hosting.js';
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { z, ZodError } from "zod";
import * as schema from "./schema.js";
import { hashPassword, verifyPassword, token, digest } from "./security.js";
type Options = {
  databasePath: string;
  allowedOrigins: string[];
  rateLimit?: boolean;
  secureCookie?: boolean;
  sessionDays?: number;
  staticRoot?: string;
  amapKey?: string;
  amapSecurityCode?: string;
};
type Row = {
  id: string;
  student_id: string;
  name: string;
  grade: string;
  major: string;
  gender: string;
  password_hash: string;
};
type Session = { user_id: string; token_hash: string; csrf: string };
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function buildApp(options: Options) {
  if (options.databasePath !== ":memory:")
    mkdirSync(dirname(options.databasePath), { recursive: true });
  const db = new DatabaseSync(options.databasePath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,student_id TEXT NOT NULL UNIQUE,name TEXT NOT NULL,grade TEXT NOT NULL,major TEXT NOT NULL,gender TEXT NOT NULL,password_hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS user_state(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,revision INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id); PRAGMA user_version=1;`);
  const app = Fastify({ logger: false, bodyLimit: 2 * 1024 * 1024 });
  await app.register(cookie);
  if (options.rateLimit !== false)
    await app.register(rateLimit, {
      global: false,
      max: 20,
      timeWindow: "1 minute",
    });
  const dummyHash = await hashPassword(token());
  const asProfile = (r: Row) => ({
    id: r.id,
    studentId: r.student_id,
    name: r.name,
    grade: r.grade,
    major: r.major,
    gender: r.gender,
  });
  const findUser = (id: string) =>
    db.prepare("SELECT * FROM users WHERE id=?").get(id) as Row;
  const sessions = new WeakMap<FastifyRequest, Session>();
  const fail = (status: number, code: string, message: string): never => {
    throw new ApiError(status, code, message);
  };
  const readSession = (req: FastifyRequest) => {
    const value = req.cookies.zx_session;
    if (!value) return undefined;
    return db
      .prepare("SELECT * FROM sessions WHERE token_hash=? AND expires>?")
      .get(digest(value), Date.now()) as Session | undefined;
  };
  const issue = (reply: FastifyReply, id: string) => {
    const value = token(),
      csrf = token();
    const maxAge = (options.sessionDays ?? 7) * 86400;
    db.prepare("DELETE FROM sessions WHERE expires<=?").run(Date.now());
    db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run(
      digest(value),
      id,
      csrf,
      Date.now() + maxAge * 1000,
    );
    reply.setCookie("zx_session", value, {
      httpOnly: true,
      sameSite: "lax",
      secure: options.secureCookie ?? false,
      path: "/api",
      maxAge,
    });
    return { profile: asProfile(findUser(id)), csrfToken: csrf };
  };
  app.addHook("onRequest", async (req, reply) => {
    reply
      .header("Cache-Control", "no-store")
      .header("X-Content-Type-Options", "nosniff");
    if(!req.url.split('?')[0].startsWith('/api/')) return;
    const mutation = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    if (
      mutation &&
      (!options.allowedOrigins.includes(req.headers.origin ?? "") ||
        req.headers["x-zhixing-client"] !== "web")
    )
      fail(403, "ORIGIN", "请求来源不受信任，请从本应用页面操作");
    const publicRoute = [
      "/api/health",
      "/api/auth/register",
      "/api/auth/login",
    ].includes(req.url.split("?")[0]);
    if (!publicRoute) {
      const session = readSession(req);
      if (!session) fail(401, "SESSION", "登录已失效，请重新登录");
      if (
        req.headers["x-user-id"] &&
        req.headers["x-user-id"] !== session!.user_id
      )
        fail(409, "ACCOUNT_CHANGED", "账号已在其他页面切换，请刷新后重试");
      sessions.set(req, session!);
      if (mutation && req.headers["x-csrf-token"] !== session!.csrf)
        fail(403, "CSRF", "会话校验失败，请刷新页面后重试");
    }
  });
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError)
      return reply
        .code(400)
        .send({
          error: {
            code: "VALIDATION",
            message:
              err.issues[0]?.message === "Invalid input"
                ? "请检查填写内容"
                : err.issues[0]?.message,
            fields: err.flatten().fieldErrors,
          },
        });
    if (err instanceof ApiError)
      return reply
        .code(err.statusCode)
        .send({ error: { code: err.code, message: err.message } });
    const status = (err as { statusCode?: number }).statusCode;
    return reply
      .code(status && status < 500 ? status : 500)
      .send({
        error: {
          code: status === 429 ? "RATE_LIMIT" : "REQUEST",
          message:
            status === 429
              ? "操作过于频繁，请稍后重试"
              : status && status < 500
                ? "请求格式无效"
                : "服务暂时不可用，请稍后重试",
        },
      });
  });
  const authConfig = {
    config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
  };
  app.get("/api/health", async () => ({ ok: true }));
  app.post("/api/auth/register", authConfig, async (req, reply) => {
    const input = schema.register.parse(req.body);
    if (
      db.prepare("SELECT id FROM users WHERE student_id=?").get(input.studentId)
    )
      fail(409, "STUDENT_EXISTS", "该学号已注册");
    const hash = await hashPassword(input.password),
      id = randomUUID();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?,?)").run(
        id,
        input.studentId,
        input.name,
        input.grade,
        input.major,
        input.gender,
        hash,
      );
      db.prepare("INSERT INTO user_state VALUES(?,0,?)").run(
        id,
        JSON.stringify(schema.emptyData()),
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      if (
        db
          .prepare("SELECT id FROM users WHERE student_id=?")
          .get(input.studentId)
      )
        fail(409, "STUDENT_EXISTS", "该学号已注册");
      throw e;
    }
    return reply.code(201).send(issue(reply, id));
  });
  app.post("/api/auth/login", authConfig, async (req, reply) => {
    const input = schema.login.parse(req.body);
    const user = db
      .prepare("SELECT * FROM users WHERE student_id=?")
      .get(input.studentId) as Row | undefined;
    const valid = await verifyPassword(
      input.password,
      user?.password_hash ?? dummyHash,
    );
    if (
      !user ||
      !valid ||
      findUser(user.id).password_hash !== user.password_hash
    )
      fail(401, "CREDENTIALS", "学号或密码错误");
    return issue(reply, user!.id);
  });
  app.get("/api/auth/session", async (req) => {
    const s = sessions.get(req)!;
    return { profile: asProfile(findUser(s.user_id)), csrfToken: s.csrf };
  });
  app.post("/api/auth/logout", async (req, reply) => {
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
      sessions.get(req)!.token_hash,
    );
    reply.clearCookie("zx_session", { path: "/api" });
    return { ok: true };
  });
  app.patch("/api/profile", async (req) => {
    const input = schema.profile.parse(req.body),
      id = sessions.get(req)!.user_id;
    db.prepare(
      "UPDATE users SET name=?,grade=?,major=?,gender=? WHERE id=?",
    ).run(input.name, input.grade, input.major, input.gender, id);
    return { profile: asProfile(findUser(id)) };
  });
  app.post("/api/auth/password", authConfig, async (req, reply) => {
    const input = z
      .object({ oldPassword: schema.password, newPassword: schema.password })
      .strict()
      .parse(req.body);
    const s = sessions.get(req)!,
      user = findUser(s.user_id);
    if (!(await verifyPassword(input.oldPassword, user.password_hash)))
      fail(400, "PASSWORD", "原密码错误");
    const next = await hashPassword(input.newPassword);
    db.exec("BEGIN IMMEDIATE");
    try {
      const changed = db
        .prepare(
          "UPDATE users SET password_hash=? WHERE id=? AND password_hash=?",
        )
        .run(next, user.id, user.password_hash);
      if (!changed.changes)
        fail(409, "CONFLICT", "密码已在另一页面修改，请重新登录");
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return issue(reply, user.id);
  });
  app.get("/api/state", async (req) => {
    const id = sessions.get(req)!.user_id;
    const row = db
      .prepare("SELECT revision,data FROM user_state WHERE user_id=?")
      .get(id) as { revision: number; data: string };
    return { userId: id, revision: row.revision, data: JSON.parse(row.data) };
  });
  app.put("/api/state", async (req) => {
    const input = schema.state.parse(req.body),
      id = sessions.get(req)!.user_id;
    const result = db
      .prepare(
        "UPDATE user_state SET data=?,revision=revision+1 WHERE user_id=? AND revision=?",
      )
      .run(JSON.stringify(input.data), id, input.revision);
    if (!result.changes)
      fail(409, "CONFLICT", "数据已在其他页面更新，请刷新后重试");
    return { userId: id, revision: input.revision + 1 };
  });
  if(options.staticRoot)await registerHosting(app,options);
  app.addHook("onClose", async () => db.close());
  await app.ready();
  return app;
}
