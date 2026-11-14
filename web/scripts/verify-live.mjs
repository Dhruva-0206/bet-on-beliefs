// Read-only QA against a real testnet deployment. Does not connect/sign a wallet.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { format } from "../src/amount.ts";
const market = process.argv[2];
if (market === "--help") {
  console.log(
    "Usage: node scripts/verify-live.mjs MARKET.testnet\nRequires the local production preview at http://127.0.0.1:5173. Reads live testnet state on desktop/mobile; never connects or signs a wallet.",
  );
  process.exit(0);
}
if (!market?.endsWith(".testnet"))
  throw new Error("Usage: node scripts/verify-live.mjs MARKET.testnet");
async function view(method, args = {}) {
  const response = await fetch("https://test.rpc.fastnear.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "live-ui",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: market,
        method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      },
    }),
  });
  const body = await response.json();
  if (!response.ok || body.error || body.result?.error)
    throw new Error(JSON.stringify(body));
  return JSON.parse(Buffer.from(body.result.result).toString());
}
const config = await view("config");
const selected =
  config.active ?? (config.proposal_count ? config.proposal_count - 1 : null);
const proposal =
  selected === null ? null : await view("proposal", { proposal_id: selected });
const browser = await chromium.launch();
const reports = [];
await mkdir("test-results", { recursive: true });
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5173");
    await page
      .getByText("Advanced: change market contract", { exact: true })
      .click();
    await page.getByRole("textbox", { name: "Market contract" }).fill(market);
    await page.getByRole("button", { name: "Load on-chain data" }).click();
    await expect(
      page.getByText("Connected to testnet RPC. Refreshes every 15 seconds."),
    ).toBeVisible({ timeout: 45000 });
    await expect(page.locator(".stats")).toContainText(
      format(config.treasury[0]),
    );
    await expect(
      page.getByRole("button", { name: "Connect wallet" }),
    ).toBeEnabled();
    await expect(page.locator(".funding")).toContainText(
      "Your wallet Connect to view",
    );
    if (proposal) {
      await expect(
        page.getByRole("heading", { name: proposal.title, exact: true }),
      ).toBeVisible();
      await expect(page.locator(".market")).toContainText(
        "Collateral backing:",
      );
      await expect(page.locator(".world")).toHaveCount(
        proposal.outcome === null ? 2 : 0,
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page
      .getByText("Advanced: change market contract", { exact: true })
      .click();
    await page.screenshot({
      path: `test-results/live-${name}.png`,
      fullPage: true,
    });
    reports.push({
      viewport: name,
      market,
      treasury_belief: config.treasury[0],
      proposal_id: selected,
      proposal_execution: proposal?.execution ?? null,
      runtime_errors: errors,
      live_chain_reads: true,
      wallet_signed: false,
      horizontal_overflow: false,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
const report = {
  verified_at_utc: new Date().toISOString(),
  network: "testnet",
  reports,
};
await writeFile(
  "test-results/live-report.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
