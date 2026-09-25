import { test, expect } from "@playwright/test";
test("无需高德请求的校园预演、规划与示例来源保存", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (/amap.com|_AMapService/.test(r.url())) calls.push(r.url());
  });
  await page.goto("/login");
  await page.getByRole("button", { name: /林同学/ }).click();
  await page.goto("/travel");
  await expect(page.getByText("校园路网示意", { exact: true })).toBeVisible();
  await page.getByLabel("出发地点").fill("示例宿舍");
  await page.getByRole("button", { name: "搜索", exact: true }).first().click();
  await page.getByRole("button", { name: /^示例宿舍/ }).click();
  await page.getByLabel("目的地点").fill("图书馆");
  await page.getByRole("button", { name: "搜索", exact: true }).last().click();
  await page.getByRole("button", { name: /^图书馆/ }).click();
  await page.getByRole("button", { name: "规划路线", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("尚未核实");
  await page.getByRole("checkbox", { name: /使用待核实数据预演/ }).check();
  await page.getByRole("button", { name: "规划路线", exact: true }).click();
  await expect(page.getByText(/示例距离与时间/)).toBeVisible();
  await page.getByRole("button", { name: "加入今日安排" }).click();
  const records = await page.evaluate(
    () => JSON.parse(localStorage.getItem("zhixing:data:demo-lin")!).records,
  );
  expect(records.at(-1).source).toBe("示例");
  expect(records.at(-1).distance).toBe(0.5);
  await page.goto("/planner");
  await page.getByRole("checkbox", { name: /使用待核实数据预演/ }).check();
  await page.getByLabel("行程起点").fill("示例宿舍");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await page.getByRole("button", { name: /^示例宿舍/ }).click();
  await page.getByRole("button", { name: "按当前顺序规划" }).click();
  await expect(page.getByText(/示例预演：包含待核实/)).toBeVisible();
  await page.getByRole("button", { name: "删除任务" }).first().click();
  await expect(
    page.getByRole("heading", { name: "想做的事，顺路一起完成" }),
  ).toBeVisible();
  await expect(page.getByText("这趟行程，安排好了")).toHaveCount(0);
  expect(calls).toEqual([]);
});
