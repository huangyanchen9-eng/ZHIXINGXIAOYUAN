import { test, expect } from "@playwright/test";

test("首页玻璃试版：响应式、图片及已有入口", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 8, 26, 9, 0));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  await page.getByRole("button", { name: /林同学/ }).click();
  const photo = page.getByAltText("大连海事大学日光下的校园建筑与湖面倒影");
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  for (const width of [1440, 880, 768, 706, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await expect(
      page.getByRole("link", { name: "安排今日行程" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `screenshots/home-mobile-glass-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.screenshot({
      path: `screenshots/home-mobile-glass-${width}-screen.png`,
      animations: "disabled",
    });
  }
  await page.getByRole("link", { name: "安排今日行程" }).click();
  await expect(page).toHaveURL(/planner/);
  await page.goto("/");
  await page.getByRole("button", { name: "打开快捷功能" }).click();
  await page.getByRole("link", { name: /我的课表 课程/ }).click();
  await expect(page).toHaveURL(/schedule/);
  await page.goto("/");
  await page.getByRole("button", { name: "打开快捷功能" }).click();
  await page.getByRole("link", { name: /今天吃什么/ }).click();
  await expect(page).toHaveURL(/meals/);
  await page.goto("/");
  await page.getByRole("button", { name: "记录", exact: true }).click();
  await expect(page.getByRole("button", { name: /吃得怎么样/ })).toBeVisible();
});

test("新账号首页：空安排可添加，保存后接下来卡片更新，完成后不再显示", async ({
  page,
}) => {
  await page.clock.install({ time: new Date(2026, 8, 26, 13, 0) });
  await page.goto("/register");
  await page.getByLabel("学号", { exact: true }).fill("008" + Date.now());
  await page.getByLabel("密码", { exact: true }).fill("Home-preview-2026");
  await page.getByLabel("确认密码", { exact: true }).fill("Home-preview-2026");
  await page.getByLabel("姓名", { exact: true }).fill("首页测试同学");
  await page.getByLabel("专业", { exact: true }).fill("软件工程");
  await page.getByRole("button", { name: "注册并进入校园" }).click();
  await page.getByRole("button", { name: "添加今日安排" }).click();
  await page.getByRole("button", { name: /记住一件小事/ }).click();
  await page.getByLabel("名称", { exact: true }).fill("去湖畔读书");
  await page.getByLabel("开始时间", { exact: true }).fill("14:00");
  await page.getByLabel("预计时长（分钟）").fill("30");
  await page.getByRole("button", { name: "保存记录" }).click();
  const upcoming = page.getByRole("region", { name: "接下来的安排" });
  await expect(upcoming.getByText("去湖畔读书")).toBeVisible();
  await expect(upcoming.getByText("预计 30 分钟")).toBeVisible();
  await page.clock.fastForward(91 * 60 * 1000);
  await expect(
    page.getByRole("button", { name: "添加今日安排" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "打开今天的日程" }).click();
  await page
    .getByRole("button", { name: "查看去湖畔读书", exact: true })
    .click();
  await page.getByLabel("开始时间", { exact: true }).fill("16:00");
  await page.getByRole("button", { name: "保存记录" }).click();
  await page.getByRole("button", { name: "查看接下来的安排" }).click();
  await page.getByLabel("任务状态").selectOption("done");
  await page.getByRole("button", { name: "保存记录" }).click();
  await expect(
    page.getByRole("button", { name: "添加今日安排" }),
  ).toBeVisible();
  await expect(upcoming.getByText("去湖畔读书")).toHaveCount(0);
});
