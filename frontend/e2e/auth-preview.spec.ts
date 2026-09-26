import { test, expect } from "@playwright/test";

test("账号玻璃页面：手机桌面、字段校验和密码显示", async ({ page }) => {
  for (const route of ["login", "register"]) {
    await page.goto("/" + route);
    await expect(page.getByAltText("大连海事大学白天的校园与教学码头全景")).toBeVisible();
    for (const width of [390, 706, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await page.screenshot({
        path: `screenshots/auth-${route}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.goto("/login");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByText("请输入学号", { exact: true })).toBeVisible();
  const password = page.getByLabel("密码", { exact: true });
  await password.fill("Preview-password");
  await page.getByRole("button", { name: "显示密码" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "隐藏密码" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: /林同学/ }).click();
  await expect(page).toHaveURL(/\/$/);
});


