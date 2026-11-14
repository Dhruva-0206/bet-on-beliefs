import { test, expect } from "@playwright/test";
import { Transaction } from "@near-js/transactions";

for (const scenario of ["cancel", "confirm"] as const) {
  test(`faucet actions reach Meteor boundary without broadcasting (${scenario})`, async ({
    page,
  }) => {
    // Fake extension + RPC only. No real accounts, wallet keys or signatures.
    const broadcasts: string[] = [];
    const failedAssets: string[] = [];
    page.on("response", (response) => {
      if (
        new URL(response.url()).pathname.includes("/assets/") &&
        response.status() >= 400
      )
        failedAssets.push(response.url());
    });
    const errors: string[] = [];
    let keyWasLogged = false;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (
        /KeyPairEd25519|secretKey|ed25519:[1-9A-HJ-NP-Za-km-z]{80,}/.test(
          message.text(),
        )
      )
        keyWasLogged = true;
    });
    const publicKey = "ed25519:" + "1".repeat(32);
    await page.addInitScript(
      ({ publicKey, scenario }) => {
        let listener: (data: unknown) => void;
        const state = window as unknown as Record<string, unknown>;
        state.faucetSigningRequests = [];
        state.meteorCom = {
          addMessageDataListener(callback: typeof listener) {
            listener = callback;
          },
          sendMessageData(data: {
            uid: string;
            status: string;
            actionType: string;
            network: string;
            inputs: unknown;
          }) {
            if (data.status !== "initializing") return;
            queueMicrotask(() => {
              if (data.actionType === "login") {
                listener({
                  uid: data.uid,
                  status: "closed_success",
                  payload: {
                    accountId: "wallet-fixture.testnet",
                    allKeys: [publicKey],
                  },
                });
              } else if (data.actionType === "sign") {
                (state.faucetSigningRequests as unknown[]).push(data);
                // Stop at the signing boundary. Never create a signed transaction.
                if (scenario === "cancel")
                  listener({
                    uid: data.uid,
                    status: "closed_window",
                    endTags: [],
                  });
                else
                  listener({
                    uid: data.uid,
                    status: "closed_success",
                    payload: {
                      executionOutcomes: [
                        {
                          transaction: { hash: "fixture-transaction" },
                          status: { SuccessValue: "" },
                        },
                      ],
                    },
                  });
              }
            });
          },
        };
      },
      { publicKey, scenario },
    );
    let confirmations = 0;
    await page.route(
      /https:\/\/.*(?:fastnear\.com|near\.org).*/,
      async (route) => {
        const request = route.request().postDataJSON();
        if (
          ["broadcast_tx_commit", "broadcast_tx_async", "send_tx"].includes(
            request.method,
          )
        ) {
          broadcasts.push(request.method);
          return route.abort();
        }
        let result: unknown;
        const params = request.params;
        if (request.method === "tx") {
          result = {
            final_execution_status:
              ++confirmations % 2 ? "EXECUTED_OPTIMISTIC" : "FINAL",
            status: { SuccessValue: "" },
            transaction_outcome: {
              outcome: { status: { SuccessReceiptId: "fixture" } },
            },
            receipts_outcome: [{ outcome: { status: { SuccessValue: "" } } }],
          };
        } else if (
          request.method === "query" &&
          params.request_type === "view_access_key_list"
        ) {
          result = {
            keys: [
              {
                public_key: publicKey,
                access_key: { nonce: 1, permission: "FullAccess" },
              },
            ],
          };
        } else if (request.method === "block") {
          result = { header: { hash: "1".repeat(32), height: 100 } };
        } else if (
          request.method === "query" &&
          params.request_type === "call_function"
        ) {
          let value: unknown;
          if (params.method_name === "config")
            value = {
              ready: true,
              active: null,
              proposal_count: 0,
              tokens: ["bob-dhruva-belief.testnet", "bob-dhruva-tusd.testnet"],
              treasury: ["100000000000000000000", "0"],
              reserved: ["0", "0"],
              stakes: ["0", "0"],
              outgoing: ["0", "0"],
              next_ritual_ns: "0",
              max_payment: ["1000000000000000000", "0"],
            };
          else if (params.method_name === "account")
            value = {
              registered: false,
              claims_registered: false,
              vault: ["0", "0"],
              claims: [
                ["0", "0"],
                ["0", "0"],
              ],
            };
          else if (params.method_name === "ft_balance_of") value = "0";
          else throw new Error(`Unexpected view ${params.method_name}`);
          result = {
            result: Array.from(new TextEncoder().encode(JSON.stringify(value))),
          };
        } else throw new Error(`Unexpected RPC ${request.method}`);
        await route.fulfill({
          json: { jsonrpc: "2.0", id: request.id, result },
        });
      },
    );
    await page.goto("./");
    expect(new URL(page.url()).pathname).toBe(
      new URL(test.info().project.use.baseURL!).pathname,
    );
    await page
      .getByText("Advanced: change market contract", { exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Market contract" })
      .fill("bob-dhruva-market.testnet");
    await page.getByRole("button", { name: "Load on-chain data" }).click();
    await page.getByRole("button", { name: "Connect wallet" }).click();
    await page.getByText("Meteor Wallet", { exact: true }).click();
    await expect(
      page.getByRole("button", { name: /wallet-fixture.testnet/ }),
    ).toBeVisible();
    for (const [index, receiver] of [
      "bob-dhruva-belief.testnet",
      "bob-dhruva-tusd.testnet",
    ].entries()) {
      await page
        .getByRole("button", { name: /Get 100 (BELIEF|tUSD)/ })
        .nth(index)
        .click();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (
                (window as unknown as Record<string, unknown>)
                  .faucetSigningRequests as unknown[]
              ).length,
          ),
        )
        .toBe(index + 1);
      const request = await page.evaluate(
        (index) =>
          (
            (window as unknown as Record<string, unknown>)
              .faucetSigningRequests as Array<{
              network: string;
              inputs: { transactions: string };
            }>
          )[index],
        index,
      );
      expect(request.network).toBe("testnet");
      const tx = Transaction.decode(
        Buffer.from(request.inputs.transactions, "base64"),
      );
      expect(tx.receiverId).toBe(receiver);
      expect(tx.signerId).toBe("wallet-fixture.testnet");
      expect(tx.actions.map((a) => a.functionCall?.methodName)).toEqual([
        "storage_deposit",
        "faucet",
      ]);
      expect(tx.actions.map((a) => a.functionCall?.deposit)).toEqual([
        10n ** 22n,
        0n,
      ]);
      expect(tx.actions.map((a) => a.functionCall?.gas)).toEqual([
        100000000000000n,
        100000000000000n,
      ]);
      expect(
        tx.actions.map((a) =>
          JSON.parse(
            new TextDecoder().decode(Uint8Array.from(a.functionCall!.args)),
          ),
        ),
      ).toEqual([{ registration_only: true }, {}]);
      if (scenario === "cancel")
        await expect(page.getByRole("alert")).toContainText(
          "Wallet approval cancelled",
        );
      else {
        await expect(
          page
            .getByRole("button", { name: /Get 100 (BELIEF|tUSD)/ })
            .nth(index),
        ).toBeDisabled();
        await expect(page.getByRole("status")).toContainText(
          "Transaction confirmed with successful final receipts",
        );
        expect(
          await page.evaluate(() => sessionStorage.getItem("belief-pending")),
        ).toBeNull();
      }
    }
    expect(broadcasts).toEqual([]);
    expect(failedAssets).toEqual([]);
    expect(errors).toEqual([]);
    expect(keyWasLogged).toBe(false);
  });
}
