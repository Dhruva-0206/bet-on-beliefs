import { test, expect } from "@playwright/test";
test("production app loads without runtime errors or fabricated chain data", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Put your beliefs",
  );
  await expect(
    page.getByText(
      "No deployment loaded. No sample balances or proposals are shown.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Connect wallet" }),
  ).toBeDisabled();
  await expect(
    page.getByText("No proposals yet.", { exact: false }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/empty-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("invalid network account cannot load or enable wallet transactions", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Market contract" })
    .fill("mainnet.near");
  await page.getByRole("button", { name: "Load on-chain data" }).click();
  await expect(page.getByRole("alert")).toContainText("valid .testnet");
  await expect(
    page.getByRole("button", { name: "Connect wallet" }),
  ).toBeDisabled();
});
test("testnet RPC failure is visible and wallet modules load without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://rpc.testnet.near.org/", (route) =>
    route.fulfill({
      json: {
        jsonrpc: "2.0",
        id: "belief",
        error: { message: "Unavailable testnet contract" },
      },
    }),
  );
  await page.addInitScript(() =>
    localStorage.setItem("belief-contract", "unavailable.testnet"),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Unavailable testnet contract",
  );
  await expect(
    page.getByRole("button", { name: "Connect wallet" }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});
test("production wallet adapter initializes explicitly on testnet", async ({
  page,
}) => {
  const { readdirSync } = await import("node:fs");
  const files = readdirSync("dist/assets");
  const core = files.find((f) => f.startsWith("core-") && f.endsWith(".js"))!;
  const mynear = files.find(
    (f) => f.startsWith("my-near-wallet-") && f.endsWith(".js"),
  )!;
  await page.goto("/");
  const result = await page.evaluate(
    async (paths) => {
      const { setupWalletSelector } = await import(paths[0]);
      const { setupMyNearWallet } = await import(paths[1]);
      const selector = await setupWalletSelector({
        network: "testnet",
        modules: [setupMyNearWallet()],
      });
      const wallet = await selector.wallet("my-near-wallet");
      return {
        network: selector.options.network.networkId,
        id: wallet.id,
        url: wallet.metadata.walletUrl ?? wallet.metadata.downloadUrl,
      };
    },
    [`/assets/${core}`, `/assets/${mynear}`],
  );
  expect(result.network).toBe("testnet");
  expect(result.id).toBe("my-near-wallet");
  expect(result.url).toContain("testnet.mynearwallet.com");
});
