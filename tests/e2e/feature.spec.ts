import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("paste-payload recruitment: B becomes A's downline; A counts 1 below", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await a.getByRole("button", { name: /join as root/ }).click();

    // grab alice's payload from her own UI
    await a.locator(".pyr-payload summary").click();
    const payload = (await a.locator(".pyr-payload code").textContent()) ?? "";
    expect(payload.startsWith("mesh://")).toBe(true);

    await b.getByPlaceholder("your name").fill("bob");
    await b.getByPlaceholder("paste a mesh:// payload").fill(payload);
    await b.getByRole("button", { name: "join via paste", exact: true }).click();

    await expect(b.locator(".pyr-recruited-by")).toContainText("alice");
    await expect(a.locator(".pyr-status")).toContainText("1 below");
    await expect(a.locator(".pyr-leaderboard")).toContainText("alice");
  } finally {
    await cleanup();
  }
});

test("personal QR is rendered and contains the room id encoded in the payload", async ({
  page,
  baseURL,
}) => {
  await page.goto(baseURL ?? "");
  await page.getByPlaceholder("your name").fill("charlie");
  await expect(page.locator(".pyr-qr-wrap svg")).toBeVisible();
  await page.locator(".pyr-payload summary").click();
  await expect(page.locator(".pyr-payload code")).toContainText("mesh://");
});
