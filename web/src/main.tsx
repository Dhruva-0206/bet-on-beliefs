import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import "@near-wallet-selector/modal-ui/styles.css";
import "./style.css";
import {
  connect,
  EXPLORER,
  transact,
  validContract,
  view,
  walletSelector,
  type Call,
} from "./chain";
import { format, parseAmount, quote, UNIT } from "./amount";
type Config = {
  ready: boolean;
  active: number | null;
  tokens: string[];
  proposal_count: number;
  treasury: string[];
  reserved: string[];
  stakes: string[];
  outgoing: string[];
  next_ritual_ns: string;
  max_payment: string[];
};
type Proposal = {
  id: number;
  title: string;
  description: string;
  proposer: string;
  action: Record<string, unknown>;
  start_ns: string;
  end_ns: string;
  pools: string[][];
  collateral: string[];
  supply: string[][];
  outcome: boolean | null;
  execution: string;
};
type Account = {
  registered: boolean;
  claims_registered: boolean;
  vault: string[];
  claims: string[][];
};
const FEE = "10000000000000000000000",
  PROPOSAL_FEE = "100000000000000000000000";
const names = ["BELIEF", "tUSD"];
function App() {
  const [contract, setContract] = useState(
    localStorage.getItem("belief-contract") ??
      import.meta.env.VITE_MARKET_CONTRACT ??
      "",
  );
  const [draft, setDraft] = useState(contract),
    [config, setConfig] = useState<Config>(),
    [proposals, setProposals] = useState<Proposal[]>([]),
    [selected, setSelected] = useState<number>(),
    [account, setAccount] = useState(""),
    [balances, setBalances] = useState<Account>(),
    [fts, setFts] = useState<string[]>(["0", "0"]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [chainError, setChainError] = useState(""),
    [note, setNote] = useState(""),
    [now, setNow] = useState(Date.now()),
    [hashes, setHashes] = useState<string[]>([]);
  const [asset, setAsset] = useState(1),
    [side, setSide] = useState(0),
    [size, setSize] = useState("10"),
    [minimum, setMinimum] = useState("0.01"),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [receiver, setReceiver] = useState(""),
    [payment, setPayment] = useState("1"),
    [seedBelief, setSeedBelief] = useState("100"),
    [seedTusd, setSeedTusd] = useState("100");
  const p = proposals.find((p) => p.id === selected),
    trading =
      !!p && p.outcome === null && BigInt(now) * 1000000n < BigInt(p.end_ns),
    base = { proposal_id: selected };
  const refreshEpoch = useRef(0);
  async function refresh() {
    const epoch = ++refreshEpoch.current;
    if (!validContract(contract)) return;
    try {
      const c = await view<Config>(contract, "config");
      const all = await Promise.all(
        Array.from({ length: c.proposal_count }, (_, id) =>
          view<Proposal>(contract, "proposal", { proposal_id: id }),
        ),
      );
      const [user, underlying] = account
        ? await Promise.all([
            view<Account>(contract, "account", {
              account_id: account,
              proposal_id: selected ?? null,
            }),
            Promise.all(
              c.tokens.map((t) =>
                view<string>(t, "ft_balance_of", { account_id: account }),
              ),
            ),
          ])
        : [undefined, ["0", "0"]];
      if (epoch !== refreshEpoch.current) return;
      setConfig(c);
      setProposals(all.reverse());
      setBalances(user);
      setFts(underlying);
      setSelected(
        (old) =>
          old ??
          c.active ??
          (c.proposal_count ? c.proposal_count - 1 : undefined),
      );
      setChainError("");
    } catch (e) {
      if (epoch !== refreshEpoch.current) return;
      setConfig(undefined);
      setChainError(String(e));
    }
  }

  useEffect(() => {
    const s = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(s);
  }, []);
  useEffect(() => {
    if (!validContract(contract)) return;
    let unsubscribe = () => {};
    let stopped = false;
    walletSelector()
      .then((s) => {
        if (stopped) return;
        const update = () =>
          setAccount(
            s.store.getState().accounts.find((a) => a.active)?.accountId ?? "",
          );
        update();
        const sub = s.store.observable.subscribe(update);
        unsubscribe = () => sub.unsubscribe();
      })
      .catch((e) => setError(String(e)));
    return () => {
      stopped = true;
      unsubscribe();
    };
  }, [contract]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => {
      refreshEpoch.current++;
      clearInterval(timer);
    };
  }, [contract, account, selected]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("transactionHashes"))
      setHashes(params.get("transactionHashes")!.split(","));
    if (params.get("errorCode"))
      setError(params.get("errorMessage") ?? params.get("errorCode")!);
  }, []);
  async function run(target: string, calls: Call[]) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const tx = await transact(target, calls);
      setHashes((h) => [...tx, ...h].slice(0, 20));
      setNote(
        "Transaction submitted. Check the explorer and refreshed on-chain state for its result.",
      );
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const send = (
    methodName: string,
    args: Record<string, unknown> = {},
    deposit = "0",
  ) => void run(contract, [{ methodName, args, deposit }]);
  function amountAction(method: string) {
    try {
      send(
        method,
        { ...base, asset_id: asset, amount: parseAmount(size) },
        ["merge", "redeem"].includes(method) ? FEE : "0",
      );
    } catch (e) {
      setError(String(e));
    }
  }
  function trade(splitFirst = false) {
    try {
      const a = parseAmount(size),
        min = parseAmount(minimum);
      const calls: Call[] = [];
      if (splitFirst)
        calls.push({
          methodName: "split",
          args: { ...base, asset_id: asset, amount: a },
        });
      calls.push({
        methodName: "trade",
        args: { ...base, side, input_asset: asset, amount: a, min_output: min },
      });
      void run(contract, calls);
    } catch (e) {
      setError(String(e));
    }
  }
  function seed(ritual = false) {
    try {
      const liquidity = {
        belief_stake: parseAmount(seedBelief),
        tusd_stake: parseAmount(seedTusd),
      };
      send(
        ritual ? "propose_ritual" : "create_proposal",
        ritual
          ? liquidity
          : {
              ...liquidity,
              title,
              description,
              action: {
                Transfer: { asset, receiver, amount: parseAmount(payment) },
              },
            },
        PROPOSAL_FEE,
      );
    } catch (e) {
      setError(String(e));
    }
  }
  let estimate = "—";
  try {
    if (p && trading)
      estimate = format(
        quote(
          p.pools[side][asset],
          p.pools[side][1 - asset],
          parseAmount(size),
        ),
      );
  } catch {
    /* incomplete input */
  }
  const disabled = busy || !account || !config?.ready;
  return (
    <main>
      <header>
        <a className="brand" href="#">
          b<span>↗</span>b <small>BET ON BELIEFS</small>
        </a>
        <div className="header-right">
          <span className="network">● NEAR TESTNET</span>
          {account ? (
            <button
              onClick={() =>
                walletSelector().then(async (s) => {
                  await (await s.wallet()).signOut();
                  setAccount("");
                  setBalances(undefined);
                })
              }
            >
              {account} · Disconnect
            </button>
          ) : (
            <button
              disabled={!config || busy}
              onClick={() =>
                void connect(contract).catch((e) => setError(String(e)))
              }
            >
              Connect wallet ↗
            </button>
          )}
        </div>
      </header>
      <section className="intro">
        <p className="eyebrow">A TREASURY WITH SOMETHING AT STAKE</p>
        <h1>
          Put your beliefs
          <br />
          on the line<span>.</span>
        </h1>
        <p>
          Trade the worlds. Let the market choose. A testnet experiment in
          treasury governance, with every decision settled on NEAR.
        </p>
      </section>
      <form
        className="connection"
        onSubmit={(e) => {
          e.preventDefault();
          if (!validContract(draft)) {
            setError("Enter a valid .testnet contract account.");
            return;
          }
          setError("");
          setChainError("");
          localStorage.setItem("belief-contract", draft);
          setConfig(undefined);
          setProposals([]);
          setSelected(undefined);
          setContract(draft);
        }}
      >
        <label>
          Market contract
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Enter deployed .testnet account"
          />
        </label>
        <button>Load on-chain data →</button>
        <small>
          {config
            ? "Connected to testnet RPC. Refreshes every 15 seconds."
            : "No deployment loaded. No sample balances or proposals are shown."}
        </small>
      </form>
      {(error || chainError) && (
        <div role="alert" className="error">
          {error || chainError}
        </div>
      )}
      {note && (
        <div role="status" className="notice">
          {note}
        </div>
      )}
      {config && (
        <>
          <section className="stats">
            {names.map((name, i) => (
              <article key={name}>
                <p>AVAILABLE {name}</p>
                <strong>{format(config.treasury[i])}</strong>
                <small>
                  Reserved {format(config.reserved[i])} · Outgoing{" "}
                  {format(config.outgoing[i])}
                </small>
              </article>
            ))}
            <article>
              <p>THE MECHANISM</p>
              <strong>PASS &gt; FAIL + 3%</strong>
              <small>
                Strict threshold · 10 minute average · 0.30% swap fee
              </small>
            </article>
          </section>
          {!config.ready && (
            <div className="notice">
              Treasury bootstrap is incomplete. Actions are disabled.{" "}
              <button
                disabled={busy || !account}
                onClick={() => send("bootstrap")}
              >
                Bootstrap initial BELIEF allocation
              </button>
            </div>
          )}
          <div className="workspace">
            <aside>
              <p className="eyebrow">DECISIONS / {config.proposal_count}</p>
              {proposals.length ? (
                proposals.map((q) => (
                  <button
                    className={`proposal-tab ${selected === q.id ? "selected" : ""}`}
                    key={q.id}
                    onClick={() => setSelected(q.id)}
                  >
                    <small>
                      #{q.id + 1} · {q.execution.replaceAll("_", " ")}
                    </small>
                    <span>{q.title}</span>
                  </button>
                ))
              ) : (
                <p>
                  No proposals yet. Fund your stakes and create the first
                  decision.
                </p>
              )}
              <a
                href={`${EXPLORER}/address/${contract}`}
                target="_blank"
                rel="noreferrer"
              >
                Inspect contract ↗
              </a>
            </aside>
            <section className="market">
              {p ? (
                <>
                  <div className="market-heading">
                    <div>
                      <p className="eyebrow">PROPOSAL #{p.id + 1}</p>
                      <h2>{p.title}</h2>
                      <p>{p.description}</p>
                    </div>
                    <span className="timer">
                      {trading
                        ? `${Math.max(0, Math.ceil((Number(BigInt(p.end_ns) / 1000000n) - now) / 1000))}s remaining`
                        : p.outcome === null
                          ? "Ready to finalize"
                          : p.outcome
                            ? "PASS selected"
                            : "FAIL selected"}
                    </span>
                  </div>
                  <p className="action">
                    {"Transfer" in p.action
                      ? (() => {
                          const a = p.action.Transfer as {
                            amount: string;
                            receiver: string;
                            asset: number;
                          };
                          return `Pay ${format(a.amount)} ${names[a.asset]} to ${a.receiver}`;
                        })()
                      : (() => {
                          const a = p.action.Burn as { amount: string };
                          return `Burn ${format(a.amount)} BELIEF`;
                        })()}
                  </p>
                  {p.execution === "execution_failed" && (
                    <div className="error">
                      Execution failed. Action funds were restored to treasury.
                      The market outcome remains {p.outcome ? "PASS" : "FAIL"};
                      winning claims still redeem.
                    </div>
                  )}
                  <div className="worlds">
                    {["PASS", "FAIL"].map((world, s) => (
                      <button
                        key={world}
                        className={`world ${side === s ? "chosen" : ""}`}
                        onClick={() => setSide(s)}
                      >
                        <small>TRADE {world}</small>
                        <strong>
                          {p.outcome === null && p.pools[s][0] !== "0"
                            ? format(
                                (
                                  (BigInt(p.pools[s][1]) * UNIT) /
                                  BigInt(p.pools[s][0])
                                ).toString(),
                              )
                            : "—"}{" "}
                          <em>tUSD / BELIEF · SPOT</em>
                        </strong>
                        <span>
                          {s === 0
                            ? "Value the action world"
                            : "Value the rejection world"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="explain">
                    Collateral backing: {format(p.collateral[0])} BELIEF and{" "}
                    {format(p.collateral[1])} tUSD. Settlement compares the
                    fixed interval average, not these current spot prices.
                  </p>
                  <p className="explain">
                    Higher FAIL valuation means the rejection world is valued
                    more highly. Buying FAIL is not a short in BELIEF. These are
                    conditional token claims, not an all-or-nothing bet.
                  </p>
                  {account && (
                    <>
                      <div className="balances">
                        {["PASS", "FAIL"].map((world, s) => (
                          <div key={world}>
                            <small>YOUR {world} CLAIMS</small>
                            {names.map((name, a) => (
                              <p key={name}>
                                <span>{name}</span>
                                <b>{format(balances?.claims[s][a])}</b>
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                      {!balances?.claims_registered && (
                        <button
                          disabled={disabled}
                          onClick={() => send("register_claims", base, FEE)}
                        >
                          Register claims · 0.01 NEAR
                        </button>
                      )}
                      <div className="trade-form">
                        <label>
                          Spend / manage
                          <select
                            value={asset}
                            onChange={(e) => setAsset(+e.target.value)}
                          >
                            {names.map((n, a) => (
                              <option key={n} value={a}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Amount
                          <input
                            inputMode="decimal"
                            value={size}
                            onChange={(e) => setSize(e.target.value)}
                          />
                        </label>
                        <label>
                          Minimum received
                          <input
                            inputMode="decimal"
                            value={minimum}
                            onChange={(e) => setMinimum(e.target.value)}
                          />
                        </label>
                        <p>
                          Estimated output:{" "}
                          <b>
                            {estimate} {names[1 - asset]}
                          </b>
                          . This estimate is not guaranteed; your minimum is
                          enforced on chain.
                        </p>
                        <div className="buttons">
                          <button
                            disabled={
                              disabled ||
                              !trading ||
                              !balances?.claims_registered
                            }
                            onClick={() => trade()}
                          >
                            Trade {side === 0 ? "PASS" : "FAIL"} →
                          </button>
                          <button
                            className="secondary"
                            disabled={
                              disabled ||
                              !trading ||
                              !balances?.claims_registered
                            }
                            onClick={() => trade(true)}
                          >
                            Split vault & trade {side === 0 ? "PASS" : "FAIL"}
                          </button>
                        </div>
                        <small>
                          Splitting creates both worlds. The opposite side’s{" "}
                          {names[asset]} remains yours. Both operations in the
                          split-and-trade transaction must succeed.
                        </small>
                        <div className="buttons">
                          <button
                            disabled={
                              disabled ||
                              !trading ||
                              !balances?.claims_registered
                            }
                            onClick={() => amountAction("split")}
                          >
                            Split vault amount
                          </button>
                          <button
                            disabled={
                              disabled ||
                              !trading ||
                              !balances?.claims_registered
                            }
                            onClick={() => amountAction("merge")}
                          >
                            Merge equal pair · 0.01 NEAR
                          </button>
                          <button
                            disabled={
                              disabled ||
                              p.outcome === null ||
                              !balances?.claims_registered
                            }
                            onClick={() => amountAction("redeem")}
                          >
                            Redeem winner · 0.01 NEAR
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="settlement">
                    <p>
                      Outcome:{" "}
                      <b>
                        {p.outcome === null
                          ? "Unresolved"
                          : p.outcome
                            ? "PASS"
                            : "FAIL"}
                      </b>{" "}
                      · Execution: <b>{p.execution.replaceAll("_", " ")}</b>
                    </p>
                    <button
                      disabled={
                        busy || !account || p.outcome !== null || trading
                      }
                      onClick={() => send("finalize", base, FEE)}
                    >
                      Finalize · 0.01 NEAR
                    </button>
                    <button
                      className="secondary"
                      disabled={busy || !account || p.outcome !== null}
                      onClick={() => send("observe", base)}
                    >
                      Record observation
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty">
                  <h2>The next decision starts here.</h2>
                  <p>
                    Deposit both liquidity stakes below. Treasury action funds
                    are reserved at creation, and cannot be spent by another
                    proposal.
                  </p>
                </div>
              )}
            </section>
          </div>
          <section className="funding">
            <div>
              <p className="eyebrow">01 / GET TEST LIQUIDITY</p>
              <h2>Fund your conviction.</h2>
              <p>
                Faucets redistribute finite reserves, 100 tokens per call. These
                tokens have no promised value.
              </p>
              {account && !balances?.registered && (
                <button
                  disabled={busy}
                  onClick={() => send("register", {}, FEE)}
                >
                  Register market account · 0.01 NEAR
                </button>
              )}
              {names.map((name, a) => (
                <article key={name}>
                  <h3>
                    {name}{" "}
                    <small>
                      Wallet {account ? format(fts[a]) : "—"} · Vault{" "}
                      {account ? format(balances?.vault[a]) : "—"}
                    </small>
                  </h3>
                  <div className="buttons">
                    <button
                      disabled={disabled}
                      onClick={() =>
                        void run(config.tokens[a], [
                          {
                            methodName: "storage_deposit",
                            args: { registration_only: true },
                            deposit: FEE,
                          },
                          { methodName: "faucet", args: {} },
                        ])
                      }
                    >
                      Register FT & faucet
                    </button>
                    <button
                      disabled={disabled || !balances?.registered}
                      onClick={() => {
                        try {
                          void run(config.tokens[a], [
                            {
                              methodName: "ft_transfer_call",
                              args: {
                                receiver_id: contract,
                                amount: parseAmount(size),
                                msg: "stake",
                              },
                              deposit: "1",
                            },
                          ]);
                        } catch (e) {
                          setError(String(e));
                        }
                      }}
                    >
                      Deposit {size} to vault
                    </button>
                    <button
                      disabled={disabled || !balances?.registered}
                      onClick={() => {
                        try {
                          send(
                            "withdraw_stake",
                            { asset_id: a, amount: parseAmount(size) },
                            FEE,
                          );
                        } catch (e) {
                          setError(String(e));
                        }
                      }}
                    >
                      Withdraw {size}
                    </button>
                    <button
                      className="secondary"
                      disabled={disabled}
                      onClick={() => {
                        try {
                          void run(config.tokens[a], [
                            {
                              methodName: "ft_transfer_call",
                              args: {
                                receiver_id: contract,
                                amount: parseAmount(size),
                                msg: "treasury",
                              },
                              deposit: "1",
                            },
                          ]);
                        } catch (e) {
                          setError(String(e));
                        }
                      }}
                    >
                      Donate {size} to treasury
                    </button>
                  </div>
                </article>
              ))}
              <label>
                Deposit / withdraw amount
                <input
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <small>
                Vault deposits are pending stakes until you seed a proposal or
                split claims. Failed withdrawals restore vault balances.
              </small>
            </div>
            <div>
              <p className="eyebrow">02 / OPEN A DECISION</p>
              <h2>Give the treasury a direction.</h2>
              <label>
                Title
                <input
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Description
                <textarea
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <div className="row">
                <label>
                  Asset
                  <select
                    value={asset}
                    onChange={(e) => setAsset(+e.target.value)}
                  >
                    {names.map((n, a) => (
                      <option key={n} value={a}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Payment
                  <input
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Recipient .testnet account
                <input
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                />
              </label>
              <small>
                Recipient must be storage-registered in the selected FT before
                execution. Payment cap: {format(config.max_payment[asset])}{" "}
                {names[asset]}.
              </small>
              <div className="row">
                <label>
                  BELIEF liquidity stake
                  <input
                    value={seedBelief}
                    onChange={(e) => setSeedBelief(e.target.value)}
                  />
                </label>
                <label>
                  tUSD liquidity stake
                  <input
                    value={seedTusd}
                    onChange={(e) => setSeedTusd(e.target.value)}
                  />
                </label>
              </div>
              <p>
                Both stakes come from your vault and seed identical PASS and
                FAIL pools. Existing pool claims return to you at resolution.
              </p>
              <div className="buttons">
                <button
                  disabled={
                    disabled ||
                    config.active !== null ||
                    !balances?.registered ||
                    !title.trim() ||
                    !validContract(receiver)
                  }
                  onClick={() => seed()}
                >
                  Propose payment · 0.1 NEAR
                </button>
                <button
                  className="secondary"
                  disabled={
                    disabled ||
                    config.active !== null ||
                    !balances?.registered ||
                    BigInt(now) * 1000000n < BigInt(config.next_ritual_ns)
                  }
                  onClick={() => seed(true)}
                >
                  Propose 1% burn ritual · 0.1 NEAR
                </button>
              </div>
              <small>
                Ritual cooldown:{" "}
                {BigInt(now) * 1000000n >= BigInt(config.next_ritual_ns)
                  ? "available"
                  : new Date(
                      Number(BigInt(config.next_ritual_ns) / 1000000n),
                    ).toUTCString()}
                . Registration and operation deposits are retained testnet fees.
              </small>
            </div>
          </section>
        </>
      )}
      {hashes.length > 0 && (
        <section className="evidence">
          <h2>Transaction evidence</h2>
          {hashes.map((h) => (
            <a
              key={h}
              target="_blank"
              rel="noreferrer"
              href={`${EXPLORER}/txns/${encodeURIComponent(h)}`}
            >
              {h} ↗
            </a>
          ))}
        </section>
      )}
      <footer>
        <strong>Experimental mechanics. Real limitations.</strong>
        <p>
          Thin liquidity and sustained or extreme short manipulation can change
          the outcome. Price is not public welfare. No audit or
          immutable/keyless claim. Market and token deployment keys remain
          controlled by their owners. Testnet only.
        </p>
        <a href="https://github.com/Dhruva-0206/bet-on-beliefs">
          Source, tests & AI assistance disclosure ↗
        </a>
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
