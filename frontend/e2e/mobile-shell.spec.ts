import { test, expect, type Locator } from "@playwright/test";

async function gesture(target: Locator, horizontal = true) {
  await target.dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 320, clientY: 400 }],
  });
  await target.dispatchEvent("touchend", {
    changedTouches: [
      {
        identifier: 1,
        clientX: horizontal ? 130 : 310,
        clientY: horizontal ? 410 : 550,
      },
    ],
  });
}

test("手机玻璃界面：五页背景、快捷面板、日历、滑动和横向内容互不干扰", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByRole("button", { name: /林同学/ }).click();
  await expect(
    page.getByRole("heading", { name: /开始绿色校园生活/ }),
  ).toBeVisible();
  await expect(page.locator("aside")).toHaveCount(0);
  await expect(page.getByText("生活有序，也要有趣")).toHaveCount(0);
  await expect(page.getByText("生活的小小进度")).toHaveCount(0);
  await page.getByRole("button", { name: "打开快捷功能" }).click();
  const controls = page.getByRole("dialog", { name: "快捷功能" });
  await expect(controls.getByRole("link")).toHaveCount(4);
  await page.screenshot({
    path: "screenshots/mobile-controls.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "打开快捷功能" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "打开今天的日程" }).click();
  await expect(
    page.getByRole("dialog", { name: "今天，按自己的节奏" }),
  ).toBeVisible();
  await page.screenshot({
    path: "screenshots/mobile-agenda.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await gesture(page.locator("main"), false);
  await expect(page).toHaveURL(/\/$/);
  await gesture(page.locator("main"));
  await expect(page).toHaveURL(/\/travel$/);
  const nav = page.getByRole("navigation", { name: "主导航" });
  const backgrounds = new Set<string>();
  for (const name of ["今日", "出行", "生活", "成长", "我的"]) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const photo = page.locator("picture img");
    await expect(photo).toBeVisible();
    await expect
      .poll(() =>
        photo.evaluate(
          (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
        ),
      )
      .toBeTruthy();
    backgrounds.add(
      await photo.evaluate((el: HTMLImageElement) => el.currentSrc),
    );
    await page.screenshot({
      path: `screenshots/section-${name}.png`,
      animations: "disabled",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  expect(backgrounds.size).toBe(5);
  await page.goto('/health');
  for (const width of [706, 390]) {
    await page.setViewportSize({ width, height: 898 });
    const prediction = page.locator('section').filter({ has: page.getByRole('heading', { name: '下一周健康趋势' }) });
    const record = page.getByRole('button', { name: '记录', exact: true });
    const cardBox = (await prediction.boundingBox())!;
    const buttonBox = (await record.boundingBox())!;
    expect(buttonBox.y - (cardBox.y + cardBox.height)).toBeGreaterThanOrEqual(23);
    await page.screenshot({ path: `screenshots/health-white-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: '记录', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '记录一下，今天的生活' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto("/schedule");
  const scroller = page.locator('[class*="scheduleScroll"]');
  await expect(scroller).toBeVisible();
  expect(
    await scroller.evaluate((el) => el.scrollWidth > el.clientWidth),
  ).toBeTruthy();
  await gesture(scroller);
  await expect(page).toHaveURL(/\/schedule$/);
  await gesture(nav);
  await expect(page).toHaveURL(/\/travel$/);
});
