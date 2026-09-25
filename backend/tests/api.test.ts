import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/app.js";
import { data as dataSchema, emptyData } from "../src/schema.js";
const origin = "http://localhost:5173";
const headers = { origin, "x-zhixing-client": "web" };
const profile = (id = "00001234") => ({
  studentId: id,
  password: "Campus-Test-2026",
  name: "测试学生",
  grade: "2026",
  major: "计算机科学与技术",
  gender: "不愿透露",
});
function credentials(response: any) {
  const body = response.json();
  return {
    cookie: response.cookies.find((c: any) => c.name === "zx_session")?.value,
    csrf: body.csrfToken,
    profile: body.profile,
  };
}
const signed = (c: any) => ({
  ...headers,
  cookie: "zx_session=" + c.cookie,
  "x-csrf-token": c.csrf,
});

test("注册、唯一学号、登录密码与 Cookie 会话", async () => {
  const app = await buildApp({
    databasePath: ":memory:",
    allowedOrigins: [origin],
    rateLimit: false,
  });
  try {
    const reg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers,
      payload: profile(),
    });
    assert.equal(reg.statusCode, 201);
    const c = credentials(reg);
    assert.equal(c.profile.studentId, "00001234");
    assert.ok(c.cookie);
    assert.ok(reg.headers["set-cookie"]?.toString().includes("HttpOnly"));
    assert.equal(reg.json().profile.password, undefined);
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers,
      payload: profile(),
    });
    assert.equal(duplicate.statusCode, 409);
    const bad = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers,
      payload: { studentId: "00001234", password: "wrongpassword" },
    });
    assert.equal(bad.statusCode, 401);
    const good = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers,
      payload: { studentId: "00001234", password: "Campus-Test-2026" },
    });
    assert.equal(good.statusCode, 200);
    const read = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { cookie: "zx_session=" + c.cookie },
    });
    assert.equal(read.json().profile.name, "测试学生");
    await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: signed(c),
    });
    assert.equal(
      (
        await app.inject({
          url: "/api/state",
          headers: { cookie: "zx_session=" + c.cookie },
        })
      ).statusCode,
      401,
    );
  } finally {
    await app.close();
  }
});

test("服务端拒绝重复成绩、无效日期与课程冲突，接受跨午夜及全部数据类型", async () => {
  const app = await buildApp({
    databasePath: ":memory:",
    allowedOrigins: [origin],
    rateLimit: false,
  });
  try {
    const c = credentials(
      await app.inject({
        method: "POST",
        url: "/api/auth/register",
        headers,
        payload: profile("all-data"),
      }),
    );
    const data: any = emptyData();
    data.records = [
      {
        id: "meal",
        kind: "meal",
        date: "2026-09-25",
        title: "晚餐计划",
        meal: "晚餐",
        portion: "1份",
        planned: true,
      },
      {
        id: "sleep",
        kind: "sleep",
        date: "2026-09-25",
        title: "睡眠",
        sleepStart: "2026-09-24T23:30",
        sleepEnd: "2026-09-25T07:00",
      },
      {
        id: "exercise",
        kind: "exercise",
        date: "2026-09-25",
        title: "散步",
        duration: 30,
      },
      {
        id: "mood",
        kind: "mood",
        date: "2026-09-25",
        title: "心情",
        mood: 4,
        stress: 2,
      },
      {
        id: "course",
        kind: "course",
        date: "2026-09-25",
        title: "课程",
        weekday: 1,
        weeks: "1-18",
        start: "08:00",
        end: "09:00",
        place: "学汇楼",
      },
      {
        id: "task",
        kind: "task",
        date: "2026-09-25",
        title: "任务",
        done: true,
      },
    ];
    data.messages = [
      { id: "message", role: "assistant", text: "示例回复", link: "/meals" },
    ];
    data.awards = [{ lesson: "lesson-1", score: 100, date: "2026-09-25" }];
    data.preferences.avoid = "花生";
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/state",
          headers: signed(c),
          payload: { revision: 0, data },
        })
      ).statusCode,
      200,
    );
    const saved = (
      await app.inject({ url: "/api/state", headers: signed(c) })
    ).json().data;
    assert.deepEqual(saved, data);
    assert.equal(saved.records[0].kcal, undefined);
    const bad = structuredClone(data);
    bad.awards.push(bad.awards[0]);
    assert.equal(dataSchema.safeParse(bad).success, false);
    bad.awards = [];
    bad.records[0].date = "2026-02-30";
    assert.equal(dataSchema.safeParse(bad).success, false);
    const overlap = structuredClone(data);
    overlap.records.push({ ...overlap.records[4], id: "conflict" });
    assert.equal(dataSchema.safeParse(overlap).success, false);
    assert.equal(
      (
        await app.inject({
          url: "/api/state",
          headers: { ...signed(c), "x-user-id": "other-user" },
        })
      ).statusCode,
      409,
    );
  } finally {
    await app.close();
  }
});

test("改密与旧密码登录并发时旧凭据不能留下有效会话", async () => {
  const app = await buildApp({
    databasePath: ":memory:",
    allowedOrigins: [origin],
    rateLimit: false,
  });
  try {
    const c = credentials(
      await app.inject({
        method: "POST",
        url: "/api/auth/register",
        headers,
        payload: profile(),
      }),
    );
    const changing = app.inject({
      method: "POST",
      url: "/api/auth/password",
      headers: signed(c),
      payload: {
        oldPassword: "Campus-Test-2026",
        newPassword: "Concurrent-new-2026",
      },
    });
    await new Promise((r) => setTimeout(r, 150));
    const entering = app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers,
      payload: { studentId: "00001234", password: "Campus-Test-2026" },
    });
    const [changed, entered] = await Promise.all([changing, entering]);
    assert.equal(changed.statusCode, 200);
    if (entered.statusCode === 200)
      assert.equal(
        (
          await app.inject({
            url: "/api/state",
            headers: signed(credentials(entered)),
          })
        ).statusCode,
        401,
      );
    else assert.equal(entered.statusCode, 401);
  } finally {
    await app.close();
  }
});

test("全部数据真实落库、账号隔离、并发冲突及跨重启恢复", async () => {
  const dir = mkdtempSync(join(tmpdir(), "zhixing-api-"));
  const path = join(dir, "test.sqlite");
  let app = await buildApp({
    databasePath: path,
    allowedOrigins: [origin],
    rateLimit: false,
  });
  try {
    const a = credentials(
      await app.inject({
        method: "POST",
        url: "/api/auth/register",
        headers,
        payload: profile("0001"),
      }),
    );
    const b = credentials(
      await app.inject({
        method: "POST",
        url: "/api/auth/register",
        headers,
        payload: profile("0002"),
      }),
    );
    const state = (
      await app.inject({ url: "/api/state", headers: signed(a) })
    ).json();
    assert.equal(state.data.records.length, 0);
    state.data.records.push({
      id: "note-1",
      kind: "task",
      date: "2026-09-25",
      title: "只属于 A 的待办",
      duration: 30,
      done: false,
      source: "手动",
    });
    const saved = await app.inject({
      method: "PUT",
      url: "/api/state",
      headers: signed(a),
      payload: { revision: state.revision, data: state.data },
    });
    assert.equal(saved.statusCode, 200);
    assert.equal(
      (await app.inject({ url: "/api/state", headers: signed(b) })).json().data
        .records.length,
      0,
    );
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/state",
          headers: signed(a),
          payload: { revision: state.revision, data: state.data },
        })
      ).statusCode,
      409,
    );
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/state",
          headers: signed(b),
          payload: { revision: 0, data: state.data, userId: a.profile.id },
        })
      ).statusCode,
      400,
    );
    await app.close();
    app = await buildApp({
      databasePath: path,
      allowedOrigins: [origin],
      rateLimit: false,
    });
    const restored = (
      await app.inject({ url: "/api/state", headers: signed(a) })
    ).json();
    assert.equal(restored.data.records[0].title, "只属于 A 的待办");
    assert.equal(restored.revision, 1);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("拒绝越权、CSRF 与非法数据，失败不污染保存状态", async () => {
  const app = await buildApp({
    databasePath: ":memory:",
    allowedOrigins: [origin],
    rateLimit: false,
  });
  try {
    assert.equal((await app.inject({ url: "/api/state" })).statusCode, 401);
    const c = credentials(
      await app.inject({
        method: "POST",
        url: "/api/auth/register",
        headers,
        payload: profile(),
      }),
    );
    const { data } = (
      await app.inject({ url: "/api/state", headers: signed(c) })
    ).json();
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/state",
          headers: { ...headers, cookie: "zx_session=" + c.cookie },
          payload: { revision: 0, data },
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/state",
          headers: { ...signed(c), origin: "https://evil.example" },
          payload: { revision: 0, data },
        })
      ).statusCode,
      403,
    );
    data.records = [
      {
        id: "x",
        kind: "sleep",
        date: "2026-09-25",
        title: "坏数据",
        sleepStart: "2026-09-25T08:00",
        sleepEnd: "2026-09-25T07:00",
      },
    ];
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/state",
          headers: signed(c),
          payload: { revision: 0, data },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (await app.inject({ url: "/api/state", headers: signed(c) })).json()
        .revision,
      0,
    );
  } finally {
    await app.close();
  }
});

test("资料不可变更学号，改密验证原密码并撤销其他会话", async () => {
  const app = await buildApp({
    databasePath: ":memory:",
    allowedOrigins: [origin],
    rateLimit: false,
  });
  try {
    const c = credentials(
      await app.inject({
        method: "POST",
        url: "/api/auth/register",
        headers,
        payload: profile(),
      }),
    );
    const other = credentials(
      await app.inject({
        method: "POST",
        url: "/api/auth/login",
        headers,
        payload: { studentId: "00001234", password: "Campus-Test-2026" },
      }),
    );
    assert.equal(
      (
        await app.inject({
          method: "PATCH",
          url: "/api/profile",
          headers: signed(c),
          payload: {
            name: "新姓名",
            grade: "2025",
            major: "软件工程",
            gender: "男",
            studentId: "hijacked",
          },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: "PATCH",
          url: "/api/profile",
          headers: signed(c),
          payload: {
            name: "新姓名",
            grade: "2025",
            major: "软件工程",
            gender: "男",
          },
        })
      ).json().profile.name,
      "新姓名",
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/password",
          headers: signed(c),
          payload: {
            oldPassword: "wrongpassword",
            newPassword: "New-Campus-2026",
          },
        })
      ).statusCode,
      400,
    );
    const changed = await app.inject({
      method: "POST",
      url: "/api/auth/password",
      headers: signed(c),
      payload: {
        oldPassword: "Campus-Test-2026",
        newPassword: "New-Campus-2026",
      },
    });
    assert.equal(changed.statusCode, 200);
    assert.equal(
      (await app.inject({ url: "/api/state", headers: signed(other) }))
        .statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/login",
          headers,
          payload: { studentId: "00001234", password: "Campus-Test-2026" },
        })
      ).statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/login",
          headers,
          payload: { studentId: "00001234", password: "New-Campus-2026" },
        })
      ).statusCode,
      200,
    );
  } finally {
    await app.close();
  }
});
