import { test, expect } from "@playwright/test";

test("编辑窗口删除：取消保留、失败保留、成功刷新后仍删除", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("学号", { exact: true }).fill("009" + Date.now());
  await page.getByLabel("密码", { exact: true }).fill("Delete-test-2026");
  await page.getByLabel("确认密码", { exact: true }).fill("Delete-test-2026");
  await page.getByLabel("姓名", { exact: true }).fill("删除测试");
  await page.getByLabel("专业", { exact: true }).fill("软件工程");
  await page.getByRole("button", { name: "注册并进入校园" }).click();
  await page.getByRole("button", { name: "记录", exact: true }).click();
  await page.getByRole("button", { name: /记住一件小事/ }).click();
  await expect(
    page.getByRole("button", { name: "删除记录", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("名称", { exact: true }).fill("待删除测试记录");
  await page.getByRole("button", { name: "保存记录" }).click();
  await page.getByRole("button", { name: "记录", exact: true }).click();
  await page.getByRole("link", { name: /管理已有记录/ }).click();
  await page
    .getByRole("button", { name: "编辑待删除测试记录", exact: true })
    .click();
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "删除记录", exact: true }).click();
  await expect(page.getByLabel("名称", { exact: true })).toHaveValue(
    "待删除测试记录",
  );
  await page.route("**/api/state", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 500,
          contentType: "application/json",
          body: '{"message":"测试失败"}',
        })
      : route.continue(),
  );
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "删除记录", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("删除未成功");
  await page.unroute("**/api/state");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "删除记录", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "编辑待删除测试记录", exact: true }),
  ).toHaveCount(0);
});
