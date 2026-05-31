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
    // Real-URL QR payload (post 2026-05-17): native cameras can open it.
    expect(payload).toMatch(/^https?:\/\/.+#r=.+&p=.+/);

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

test("multi-level fanout: A→B→C chain; A's recursive downline = 2, tree nests on every peer", async ({
  browser,
  baseURL,
}) => {
  // openTwoPeers gives us A + B in one context/room; add a third page (C) to
  // the SAME context so it inherits the same room id from the init script.
  const { context, a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    const c = await context.newPage();
    await c.goto(baseURL ?? "");

    // A joins as the root recruiter.
    await a.getByPlaceholder("your name").fill("alice");
    await a.getByRole("button", { name: /join as root/ }).click();
    await a.locator(".pyr-payload summary").click();
    const alicePayload = (await a.locator(".pyr-payload code").textContent()) ?? "";

    // B is recruited by A.
    await b.getByPlaceholder("your name").fill("bob");
    await b.getByPlaceholder("paste a mesh:// payload").fill(alicePayload);
    await b.getByRole("button", { name: "join via paste", exact: true }).click();
    await expect(b.locator(".pyr-recruited-by")).toContainText("alice");

    // Grab B's payload and recruit C under B — a second level of the pyramid.
    await b.locator(".pyr-payload summary").click();
    const bobPayload = (await b.locator(".pyr-payload code").textContent()) ?? "";
    await c.getByPlaceholder("your name").fill("carol");
    await c.getByPlaceholder("paste a mesh:// payload").fill(bobPayload);
    await c.getByRole("button", { name: "join via paste", exact: true }).click();
    await expect(c.locator(".pyr-recruited-by")).toContainText("bob");

    // The heart of the app: A's downline is RECURSIVE — bob (direct) plus carol
    // (grand-downline) = 2. This must be visible on A (the peer furthest from
    // the action), proving the recursive countDescendants crosses the mesh.
    await expect(a.locator(".pyr-status")).toContainText("2 below");

    // Leaderboard on A ranks alice top with a 2 downline count; bob shows 1.
    const aliceRow = a.locator(".pyr-leaderboard li").filter({ hasText: "alice" });
    await expect(aliceRow).toContainText("2 downline");
    const bobRow = a.locator(".pyr-leaderboard li").filter({ hasText: "bob" });
    await expect(bobRow).toContainText("1 downline");

    // Tree fanout renders the real nesting on A: bob's own <li> (the one whose
    // direct node-span is "bob") must contain carol nested beneath it. We pick
    // the <li> whose immediate .pyr-node text is bob (not alice's outer <li>,
    // which contains bob only as a descendant).
    const bobLi = a
      .locator(".pyr-tree li")
      .filter({ has: a.locator(".pyr-node", { hasText: "bob" }) })
      .last();
    await expect(bobLi).toContainText("carol");
    // Bob's node shows exactly 1 below (carol). Alice's node shows 2 below.
    await expect(a.locator(".pyr-node", { hasText: "bob" })).toContainText("1 below");
    await expect(a.locator(".pyr-node", { hasText: "alice" })).toContainText("2 below");
    // And A's own root status shows depth 0 (root has no recruiter).
    await expect(a.locator(".pyr-status")).toContainText("depth 0");

    await c.close();
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
  // QR payload is a real HTTPS-friendly URL with hash params now (May 2026).
  await expect(page.locator(".pyr-payload code")).toContainText("r=");
  await expect(page.locator(".pyr-payload code")).toContainText("p=");
});
