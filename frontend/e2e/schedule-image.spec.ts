import { test, expect } from "@playwright/test";
test("课表图片入口：图片随手动校对显示，保存课程但不持久化图片", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /林同学/ }).click();
  await page.goto("/schedule");
  await page.getByRole("button", { name: "上传课表图片" }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "schedule.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz1kAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(page.getByAltText("上传的课表预览")).toBeVisible();
  await page.getByRole("button", { name: "对照图片，手动录入课程" }).click();
  await expect(page.getByAltText("录入时参考的课表图片")).toBeVisible();
  await page.getByLabel("名称", { exact: true }).fill("图片对照录入课程");
  await page.getByLabel("开始时间", { exact: true }).fill("20:00");
  await page.getByLabel("结束时间", { exact: true }).fill("21:00");
  await page.getByLabel("上课地点").fill("待核对教室");
  await page.getByRole("button", { name: "保存记录" }).click();
  await expect(page.getByAltText("录入时参考的课表图片")).toHaveCount(0);
  const storage = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  expect(storage).toContain("图片对照录入课程");
  expect(storage).not.toContain("data:image");
});
