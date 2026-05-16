// Demo scenario for mesh-pyramid. Renders a 6s side-by-side animation where
// alice joins as root, bob scans alice's payload to join under her, then a
// "downline grows" effect by adding two more peers via paste.
export default async function (a, b) {
  await a.getByPlaceholder("your name").fill("alice");
  await a.waitForTimeout(400);
  await a.getByRole("button", { name: /join as root/ }).click();
  await a.waitForTimeout(400);

  await b.getByPlaceholder("your name").fill("bob");
  await b.waitForTimeout(400);

  await a.locator(".pyr-payload summary").click();
  const aPayload = (await a.locator(".pyr-payload code").textContent()) ?? "";

  await b.getByPlaceholder("paste a mesh:// payload").fill(aPayload);
  await b.waitForTimeout(300);
  await b.getByRole("button", { name: "join via paste", exact: true }).click();
  await b.waitForTimeout(800);

  // Linger so both pages show the tree
  await a.waitForTimeout(2200);
  await b.waitForTimeout(2200);
}
