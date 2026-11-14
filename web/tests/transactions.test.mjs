import { test } from "node:test";
import assert from "node:assert/strict";
import {
  finalReceipt,
  FinalFailure,
  walletError,
} from "../src/transactions.ts";
const success = {
  final_execution_status: "FINAL",
  status: { SuccessValue: "" },
  transaction_outcome: { outcome: { status: { SuccessReceiptId: "r" } } },
  receipts_outcome: [{ outcome: { status: { SuccessValue: "" } } }],
};
test("confirmation waits through pending and validates every final receipt", async () => {
  const original = globalThis.fetch;
  let calls = 0,
    pending = 0;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      result:
        ++calls === 1
          ? { final_execution_status: "EXECUTED_OPTIMISTIC" }
          : success,
    }),
  });
  try {
    await finalReceipt("public-hash", "someone.testnet", () => pending++);
    assert.equal(calls, 2);
    assert.equal(pending, 1);
  } finally {
    globalThis.fetch = original;
  }
});
test("successful top-level result cannot hide a failed receipt", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      result: {
        ...success,
        receipts_outcome: [
          { outcome: { status: { Failure: { ActionError: {} } } } },
        ],
      },
    }),
  });
  try {
    await assert.rejects(
      () => finalReceipt("hash", "someone.testnet"),
      FinalFailure,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("RPC failure and missing receipt evidence never count as confirmation", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: false });
    await assert.rejects(
      () => finalReceipt("hash", "someone.testnet"),
      /Confirmation RPC/,
    );
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ result: { ...success, receipts_outcome: [] } }),
    });
    await assert.rejects(
      () => finalReceipt("hash", "someone.testnet"),
      /incomplete/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("wallet errors give cancellation, popup and fee recovery guidance", () => {
  assert.match(walletError("User closed the window"), /cancelled/);
  assert.match(walletError("Could not open popup"), /Allow popups/);
  assert.match(walletError("NotEnoughBalance"), /testnet NEAR/);
  assert.match(
    walletError("A final receipt failed. Inspect refreshed balances."),
    /receipt failed/,
  );
});
