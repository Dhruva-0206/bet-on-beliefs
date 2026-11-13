import type { WalletSelector } from "@near-wallet-selector/core";
export const RPC = "https://test.rpc.fastnear.com";
export const EXPLORER = "https://testnet.nearblocks.io";
let selector: Promise<WalletSelector> | undefined;
export function walletSelector() {
  return (selector ??= Promise.all([
    import("@near-wallet-selector/core"),
    import("@near-wallet-selector/my-near-wallet"),
  ]).then(([{ setupWalletSelector }, { setupMyNearWallet }]) =>
    setupWalletSelector({ network: "testnet", modules: [setupMyNearWallet()] }),
  ));
}
export function validContract(id: string) {
  return id.length <= 64 && /^[a-z0-9][a-z0-9_.-]*\.testnet$/.test(id);
}
export async function connect(contract: string) {
  const s = await walletSelector();
  const { setupModal } = await import("@near-wallet-selector/modal-ui");
  setupModal(s, { contractId: contract }).show();
}
export async function view<T>(
  contract: string,
  method: string,
  args: unknown = {},
): Promise<T> {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "belief",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contract,
        method_name: method,
        args_base64: btoa(JSON.stringify(args)),
      },
    }),
  });
  if (!r.ok) throw new Error(`Testnet RPC returned ${r.status}`);
  const body = await r.json();
  if (body.error)
    throw new Error(
      typeof body.error.data === "string"
        ? body.error.data
        : JSON.stringify(body.error),
    );
  if (body.result.error) throw new Error(body.result.error);
  return JSON.parse(
    new TextDecoder().decode(new Uint8Array(body.result.result)),
  );
}
export type Call = {
  methodName: string;
  args: Record<string, unknown>;
  deposit?: string;
};
export async function transact(
  contract: string,
  calls: Call[],
): Promise<string[]> {
  const s = await walletSelector();
  if (!s.isSignedIn()) throw new Error("Connect a testnet wallet first.");
  const w = await s.wallet();
  const { actionCreators } = await import("@near-js/transactions");
  const result = await w.signAndSendTransaction({
    receiverId: contract,
    actions: calls.map((c) =>
      actionCreators.functionCall(
        c.methodName,
        c.args,
        100000000000000n,
        BigInt(c.deposit ?? "0"),
      ),
    ),
  });
  if (!result) return [];
  if (typeof result.status === "object" && "Failure" in result.status)
    throw new Error(JSON.stringify(result.status.Failure));
  return [result.transaction.hash];
}
