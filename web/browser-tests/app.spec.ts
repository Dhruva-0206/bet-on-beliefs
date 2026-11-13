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
  await page.route("https://test.rpc.fastnear.com/", (route) =>
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
test("Meteor connection opens testnet login from the production UI", async ({
  page,
}) => {
  const errors: string[] = [];
  let keyWasLogged = false;
  page.on("console", (message) => {
    if (
      /KeyPairEd25519|secretKey|ed25519:[1-9A-HJ-NP-Za-km-z]{80,}/.test(
        message.text(),
      )
    )
      keyWasLogged = true;
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://test.rpc.fastnear.com/", (route) =>
    route.fulfill({
      json: {
        result: {
          result: Array.from(
            new TextEncoder().encode(
              JSON.stringify({
                ready: true,
                active: null,
                proposal_count: 0,
                tokens: [
                  "bob-dhruva-belief.testnet",
                  "bob-dhruva-tusd.testnet",
                ],
                treasury: ["100000000000000000000", "0"],
                reserved: ["0", "0"],
                stakes: ["0", "0"],
                outgoing: ["0", "0"],
                next_ritual_ns: "0",
                max_payment: ["1000000000000000000", "0"],
              }),
            ),
          ),
        },
      },
    }),
  );
  await page.goto("/");
  await page.evaluate(() => {
    window.open = ((url: string | URL | undefined) => {
      (window as unknown as Record<string, unknown>).meteorTestPopup =
        String(url);
      return {
        closed: false,
        postMessage() {},
        focus() {},
      } as unknown as Window;
    }) as typeof window.open;
  });
  await page
    .getByRole("textbox", { name: "Market contract" })
    .fill("bob-dhruva-market.testnet");
  await page.getByRole("button", { name: "Load on-chain data" }).click();
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(page.getByText("MyNearWallet", { exact: true })).toHaveCount(0);
  await page.getByText("Meteor Wallet", { exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as Record<string, unknown>).meteorTestPopup,
      ),
    )
    .toContain("/connect/testnet/login?");
  const url = await page.evaluate(() =>
    String((window as unknown as Record<string, unknown>).meteorTestPopup),
  );
  const popup = new URL(url);
  expect(popup.origin).toBe("https://wallet.meteorwallet.app");
  expect(popup.pathname).toBe("/connect/testnet/login");
  expect(popup.searchParams.get("source")).toBe("wpm");
  expect(popup.searchParams.get("connectionUid")).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(decodeURIComponent(popup.searchParams.get("pageUri")!)).toBe(
    page.url(),
  );
  expect(errors).toEqual([]);
  expect(keyWasLogged).toBe(false);
});
