import { test, expect } from "@playwright/test";
test("真实账号：六类记录、刷新恢复、密码修改与再次登录", async ({ page }) => {
  const studentId = "001" + Date.now(),
    password = "Campus-browser-2026";
  await page.goto("/register");
  await page.getByLabel("学号", { exact: true }).fill(studentId);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.getByLabel("确认密码", { exact: true }).fill(password);
  await page.getByLabel("姓名", { exact: true }).fill("后端测试同学");
  await page.getByLabel("专业", { exact: true }).fill("软件工程");
  await page.getByRole("button", { name: "注册并进入校园" }).click();
  await expect(
    page.getByRole("heading", { name: /开始绿色校园生活/ }),
  ).toBeVisible();
  const open = async (name: RegExp) => {
    await page.getByRole("button", { name: "记录", exact: true }).click();
    await page.getByRole("button", { name }).click();
  };
  const save = async () => {
    await page.getByRole("button", { name: "保存记录" }).click();
    await expect(page.getByRole("button", { name: "保存记录" })).toHaveCount(0);
  };
  await open(/吃得怎么样/);
  await page.getByLabel("吃了什么").fill("数据库晚餐");
  await page.getByLabel("餐次", { exact: true }).selectOption("晚餐");
  await save();
  await open(/昨晚睡得好吗/);
  await page.getByLabel("入睡时间").fill("2026-09-24T23:00");
  await page.getByLabel("起床时间").fill("2026-09-25T07:00");
  await save();
  await open(/动起来的时刻/);
  await page.getByLabel("名称", { exact: true }).fill("数据库散步");
  await page.getByLabel("运动时长（分钟）").fill("30");
  await save();
  await open(/听听内心的声音/);
  await page.getByLabel("名称", { exact: true }).fill("数据库心情");
  await save();
  await open(/安排下一节课/);
  await page.getByLabel("名称", { exact: true }).fill("数据库课程");
  await page.getByLabel("上课地点").fill("学汇楼");
  await save();
  await open(/记住一件小事/);
  await page.getByLabel("名称", { exact: true }).fill("数据库待办");
  await save();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /开始绿色校园生活/ }),
  ).toBeVisible();
  const state = await page.evaluate(async () =>
    (await fetch("/api/state")).json(),
  );
  expect(new Set(state.data.records.map((r: any) => r.kind)).size).toBe(6);
  expect(
    state.data.records.find((r: any) => r.kind === "meal").kcal,
  ).toBeUndefined();
  const storage = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  expect(storage).not.toContain(password);
  expect(storage).not.toContain("数据库晚餐");
  await page.goto("/password");
  await page.getByLabel("原密码", { exact: true }).fill(password);
  await page.getByLabel("新密码", { exact: true }).fill("Changed-browser-2026");
  await page.getByLabel("确认新密码").fill("Changed-browser-2026");
  await page.getByRole("button", { name: "确认修改密码" }).click();
  await expect(page.getByText("密码已修改，其他会话已退出")).toBeVisible();
  await page.goto("/account");
  await page.getByRole("button", { name: "退出登录" }).click();
  await page.getByLabel("学号", { exact: true }).fill(studentId);
  await page.getByLabel("密码", { exact: true }).fill("Changed-browser-2026");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /开始绿色校园生活/ }),
  ).toBeVisible();
  const restored = await page.evaluate(async () =>
    (await fetch("/api/state")).json(),
  );
  expect(restored.data.records).toHaveLength(6);
});
