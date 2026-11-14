import { RPC } from "./chain.ts";
export class FinalFailure extends Error {}
export type Phase =
  | "idle"
  | "approval"
  | "submitted"
  | "confirming"
  | "confirmed"
  | "cancelled"
  | "failed"
  | "unknown";
export function walletError(error: unknown): string {
  const text = String(error);
  if (/cancel|reject|closed the window|closed.*before/i.test(text))
    return "Wallet approval cancelled. No confirmed result was received. Check wallet activity before trying again.";
  if (/popup|could.*open.*window|open.*window.*(block|failed)/i.test(text))
    return "Meteor could not open its approval window. Allow popups for this site, then connect again.";
  if (
    /insufficient|NotEnough|not enough|balance.*(exceed|low)|exceed.*balance/i.test(
      text,
    )
  )
    return "Not enough balance for this action. Check testnet NEAR for fees and the selected token or vault balance. No automatic retry was sent.";
  if (
    /expired|trading window.*(ended|closed)|window has ended|not trading/i.test(
      text,
    )
  )
    return "The trading window has ended. Refresh the proposal and use finalization or redemption instead.";
  return `${text.replace(/^Error: /, "").slice(0, 400)} Check the latest chain state before retrying. No automatic retry was sent.`;
}
export async function finalReceipt(
  hash: string,
  sender: string,
  onPending?: () => void,
): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "receipt",
        method: "tx",
        params: {
          tx_hash: hash,
          sender_account_id: sender,
          wait_until: "NONE",
        },
      }),
    });
    if (!response.ok)
      throw new Error(
        "Confirmation RPC unavailable. Keep the transaction link; check it before retrying.",
      );
    const body = await response.json();
    if (body.error) {
      if (
        !/UNKNOWN_TRANSACTION|not found|doesn't exist/i.test(
          JSON.stringify(body.error),
        )
      )
        throw new Error(
          "Receipt lookup unavailable. Check the explorer before retrying.",
        );
    } else {
      const result = body.result;
      if (result.final_execution_status === "FINAL") {
        const statuses = [
          result.status,
          result.transaction_outcome?.outcome?.status,
          ...(result.receipts_outcome ?? []).map(
            (r: { outcome: { status: unknown } }) => r.outcome.status,
          ),
        ];
        if (statuses.some((s) => s && typeof s === "object" && "Failure" in s))
          throw new FinalFailure(
            "A final transaction or receipt failed. Inspect the explorer and refreshed balances before retrying.",
          );
        if (
          !result.receipts_outcome?.length ||
          statuses.some(
            (s) =>
              !s ||
              typeof s !== "object" ||
              !("SuccessValue" in s || "SuccessReceiptId" in s),
          )
        )
          throw new Error(
            "Final receipt evidence is incomplete. Inspect the explorer before retrying.",
          );
        return;
      }
    }
    onPending?.();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(
    "Confirmation is still pending. Keep the transaction link and check the explorer; do not submit the action again.",
  );
}
