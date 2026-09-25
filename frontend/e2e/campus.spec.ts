import { test, expect } from "@playwright/test";

test("六类记录与课程到导航的入口完整可用", async ({ page }) => {
  await login(page);
  const open = async (pattern: RegExp) => {
    await page.getByRole("button", { name: "记录", exact: true }).click();
    await page.getByRole("button", { name: pattern }).click();
  };
  await open(/吃得怎么样/);
  await page.getByLabel("吃了什么").fill("手动营养未知晚餐");
  await page.getByLabel("餐次", { exact: true }).selectOption("晚餐");
  await page.getByRole("button", { name: "保存记录" }).click();
  await open(/动起来的时刻/);
  await page.getByLabel("名称", { exact: true }).fill("一次真实散步");
  await page.getByLabel("运动时长（分钟）").fill("28");
  await page.getByRole("button", { name: "保存记录" }).click();
  await open(/听听内心的声音/);
  await page.getByLabel("名称", { exact: true }).fill("测试心情记录");
  await page.getByRole("button", { name: "保存记录" }).click();
  await open(/安排下一节课/);
  await page.getByLabel("名称", { exact: true }).fill("测试晚间课程");
  await page.getByLabel("开始时间", { exact: true }).fill("18:30");
  await page.getByLabel("结束时间", { exact: true }).fill("19:30");
  await page.getByLabel("上课地点").fill("学汇楼");
  await page.getByRole("button", { name: "保存记录" }).click();
  await open(/记住一件小事/);
  await page.getByLabel("名称", { exact: true }).fill("测试待办事项");
  await page.getByRole("button", { name: "保存记录" }).click();
  const records = await page.evaluate(
    () => JSON.parse(localStorage.getItem("zhixing:data:demo-lin")!).records,
  );
  for (const kind of ["meal", "sleep", "exercise", "mood", "course", "task"])
    expect(records.some((r: any) => r.kind === kind)).toBeTruthy();
  expect(
    records.find((r: any) => r.title === "手动营养未知晚餐").kcal,
  ).toBeUndefined();
  await page.goto("/schedule");
  await expect(
    page.getByRole("button", { name: /测试晚间课程/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "去这里" }).first().click();
  await expect(page).toHaveURL(/travel\?to=/);
  await expect(page.getByLabel("目的地点")).not.toHaveValue("");
});

test("延迟对话在用户切换后不污染新用户", async ({ page }) => {
  await login(page);
  await page.goto("/assistant");
  await page.evaluate(() => {
    const original = window.setTimeout;
    window.setTimeout = ((
      handler: TimerHandler,
      timeout?: number,
      ...args: any[]
    ) =>
      original(
        handler,
        timeout === 450 ? 2500 : timeout,
        ...args,
      )) as typeof window.setTimeout;
  });
  await page.getByRole("button", { name: "午餐吃什么" }).click();
  await page
    .locator("aside nav")
    .first()
    .getByRole("link", { name: "我的", exact: true })
    .click();
  await page.getByRole("button", { name: "陈同学", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /陈同学，今天/ }),
  ).toBeVisible();
  await page.waitForTimeout(2800);
  const messages = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("zhixing:data:demo-chen") || '{"messages":[]}',
      ).messages,
  );
  expect(messages).toEqual([]);
});

test("导出文件包含全部记录字段且导航页面可打开", async ({ page }) => {
  await login(page);
  await page.goto("/history");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出筛选结果" }).click();
  expect((await downloaded).suggestedFilename()).toContain(".csv");
  await page.goto("/travel");
  await expect(page.getByLabel("出发地点")).toBeVisible();
});
async function login(page: any, name = "林同学") {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(name + "，今天") }),
  ).toBeVisible();
}
test("账号表单验证、密码不持久化、退出保护", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "注册并进入校园" }).click();
  await expect(page.getByText("请输入学号", { exact: true })).toBeVisible();
  await page.getByLabel("学号", { exact: true }).fill("0001234" + Date.now());
  await page.getByLabel("密码", { exact: true }).fill("test-only-password");
  await page.getByLabel("确认密码", { exact: true }).fill("mismatch");
  await page.getByLabel("姓名", { exact: true }).fill("测试同学");
  await page.getByLabel("专业", { exact: true }).fill("软件工程");
  await page.getByRole("button", { name: "注册并进入校园" }).click();
  await expect(page.getByText("两次密码不一致")).toBeVisible();
  await page.getByLabel("确认密码", { exact: true }).fill("test-only-password");
  await page.getByRole("button", { name: "注册并进入校园" }).click();
  await expect(
    page.getByRole("heading", { name: /测试同学，今天/ }),
  ).toBeVisible();
  const storage = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  expect(storage).not.toContain("test-only-password");
  expect(storage).not.toContain("0001234");
  await page.goto("/account");
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto("/health");
  await expect(page).toHaveURL(/login/);
});
test("三餐计划与摄入分离、刷新恢复、用户隔离", async ({ page }) => {
  await login(page);
  await page.goto("/meals");
  await page.getByRole("button", { name: "晚餐", exact: true }).click();
  const food = await page
    .getByRole("heading", { level: 3 })
    .first()
    .innerText();
  await page
    .getByRole("button", { name: "加入计划", exact: true })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText("未计入摄入");
  await page.getByRole("button", { name: "营养与记录" }).click();
  await expect(page.getByText(food, { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "营养与记录" }).click();
  await expect(page.getByText(food, { exact: true })).toBeVisible();
  await page.goto("/account");
  await page.getByRole("button", { name: "陈同学", exact: true }).click();
  await page.goto("/meals");
  await page.getByRole("button", { name: "营养与记录" }).click();
  await expect(page.getByText(food, { exact: true })).toHaveCount(0);
});
test("统一记录新增与编辑、跨午夜睡眠", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "记录", exact: true }).click();
  await page.getByRole("button", { name: /昨晚睡得好吗/ }).click();
  await page.getByLabel("入睡时间").fill("2026-09-24T23:00");
  await page.getByLabel("起床时间").fill("2026-09-25T07:30");
  await page.getByLabel("名称", { exact: true }).fill("浏览器测试睡眠");
  await page.getByRole("button", { name: "保存记录" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/history");
  await page.getByLabel("搜索记录").fill("浏览器测试睡眠");
  await expect(page.getByText("浏览器测试睡眠", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "编辑浏览器测试睡眠" }).click();
  await page.getByLabel("名称", { exact: true }).fill("已编辑睡眠");
  await page.getByRole("button", { name: "保存记录" }).click();
  await page.getByLabel("搜索记录").fill("已编辑睡眠");
  await expect(page.getByText("已编辑睡眠", { exact: true })).toBeVisible();
});
test("微课答题和重复积分防护", async ({ page }) => {
  await login(page);
  await page.goto("/growth");
  await page.getByRole("button", { name: "开始微测验" }).click();
  for (const label of [
    "适合步行的短距离，优先步行",
    "如实记录完成情况，再回顾调整",
    "同时考虑出行、停留和课程开始时间",
  ])
    await page.getByLabel(label, { exact: true }).check();
  await page.getByRole("button", { name: "提交答案" }).click();
  await expect(page.getByText(/本次答题 30/)).toBeVisible();
  const first = await page.evaluate(
    () => JSON.parse(localStorage.getItem("zhixing:data:demo-lin")!).awards,
  );
  expect(first).toHaveLength(1);
  await page.getByRole("button", { name: "重新开始微测验" }).click();
  for (const label of [
    "适合步行的短距离，优先步行",
    "如实记录完成情况，再回顾调整",
    "同时考虑出行、停留和课程开始时间",
  ])
    await page.getByLabel(label, { exact: true }).check();
  await page.getByRole("button", { name: "提交答案" }).click();
  await expect(page.getByText(/本次答题 30/)).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zhixing:data:demo-lin")!).awards
          .length,
    ),
  ).toBe(1);
});
test("每个业务页面均可打开且无运行错误", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  for (const path of [
    "/all",
    "/schedule",
    "/travel",
    "/planner",
    "/life",
    "/meals",
    "/health",
    "/history",
    "/growth",
    "/assistant",
    "/account",
    "/settings",
    "/password",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("AI 对话落盘且可跳转三餐", async ({ page }) => {
  await login(page);
  await page.goto("/assistant");
  await page.getByRole("button", { name: "午餐吃什么" }).click();
  await page.getByRole("link", { name: "去看看三餐搭配" }).click();
  await expect(page).toHaveURL(/meals/);
  await page.goto("/assistant");
  await expect(
    page.getByText("午餐吃什么", { exact: true }).first(),
  ).toBeVisible();
});
test("390、768、1440 响应式与视觉截图", async ({ page }) => {
  await login(page);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/");
    await expect(page.locator("main h1")).toBeVisible();
    await page.screenshot({
      path: `screenshots/home-${width}.png`,
      fullPage: true,
    });
    for (const path of [
      "/schedule",
      "/meals",
      "/travel",
      "/planner",
      "/account",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      expect(overflow, `${width}px ${path} 溢出`).toBe(false);
    }
  }
});
