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
import {
  finalReceipt,
  walletError,
  FinalFailure,
  type Phase,
} from "./transactions";
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
      "bob-dhruva-market.testnet",
  );
  const [draft, setDraft] = useState(contract),
    [config, setConfig] = useState<Config>(),
    [proposals, setProposals] = useState<Proposal[]>([]),
    [selected, setSelected] = useState<number>(),
    [account, setAccount] = useState(""),
    [balances, setBalances] = useState<Account>(),
    [fts, setFts] = useState<string[]>(["0", "0"]);
  const submitting = useRef(false);
  const [pending, setPending] = useState<{
    hash: string;
    sender: string;
  } | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("belief-pending") ?? "null");
    } catch {
      return null;
    }
  });
  function savePending(value: { hash: string; sender: string } | null) {
    setPending(value);
    if (value) sessionStorage.setItem("belief-pending", JSON.stringify(value));
    else sessionStorage.removeItem("belief-pending");
  }
  async function recheck() {
    if (!pending || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setArea("");
    setError("");
    setNote(
      "Checking the saved transaction. No new transaction is being sent.",
    );
    setHashes((h) => [...new Set([pending.hash, ...h])].slice(0, 20));
    try {
      await finalReceipt(pending.hash, pending.sender);
      savePending(null);
      setPhase("confirmed");
      setNote("Saved transaction confirmed with successful final receipts.");
      await refresh();
    } catch (e) {
      if (e instanceof FinalFailure) {
        savePending(null);
        setPhase("failed");
      }
      setError(walletError(e));
      setNote("");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const [actionHash, setActionHash] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [area, setArea] = useState("");
  const [updated, setUpdated] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [chainError, setChainError] = useState(""),
    [note, setNote] = useState(""),
    [now, setNow] = useState(Date.now()),
    [hashes, setHashes] = useState<string[]>([]);
  const [proposalAsset, setProposalAsset] = useState(0);
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
  const walletAccount = useRef("");
  async function refresh() {
    const epoch = ++refreshEpoch.current;
    if (!validContract(contract)) return;
    setLoading(true);
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
      setUpdated(Date.now());
    } catch (e) {
      if (epoch !== refreshEpoch.current) return;
      setConfig(undefined);
      setChainError(String(e));
    } finally {
      if (epoch === refreshEpoch.current) setLoading(false);
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
        const update = () => {
          const next =
            s.store.getState().accounts.find((a) => a.active)?.accountId ?? "";
          if (walletAccount.current !== next) {
            walletAccount.current = next;
            setBalances(undefined);
            setFts(["", ""]);
            setAccount(next);
          }
        };
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
    if (submitting.current || pending) return;
    submitting.current = true;
    const actionArea =
      document.activeElement
        ?.closest("[data-action-area]")
        ?.getAttribute("data-action-area") ?? "";
    setArea(actionArea);
    setActionHash("");
    setBusy(true);
    setError("");
    setPhase("approval");
    setNote(
      "Awaiting Meteor approval. Review the receiver, method and testnet NEAR deposit in your wallet.",
    );
    let submitted = false;
    try {
      const tx = await transact(target, calls);
      if (!tx.length) {
        setPhase("unknown");
        setNote(
          "Meteor returned without a transaction receipt. Check wallet activity before attempting this action again.",
        );
        return;
      }
      submitted = true;
      setActionHash(tx[0]);
      savePending({ hash: tx[0], sender: account });
      setHashes((h) => [...new Set([...tx, ...h])].slice(0, 20));
      setPhase("submitted");
      setNote("Transaction submitted. Waiting for final chain confirmation.");
      for (const hash of tx)
        await finalReceipt(hash, account, () => {
          setPhase("confirming");
          setNote("Transaction pending confirmation. Do not submit it again.");
        });
      savePending(null);
      setPhase("confirmed");
      setNote(
        "Transaction confirmed with successful final receipts. Review the refreshed balances below.",
      );
      await refresh();
    } catch (e) {
      if (e instanceof FinalFailure) savePending(null);
      setPhase(
        submitted && !(e instanceof FinalFailure)
          ? "unknown"
          : /cancel|reject|closed/i.test(String(e))
            ? "cancelled"
            : "failed",
      );
      setNote("");
      setError(walletError(e));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const feedback = (key: string) =>
    area === key && (error || note) ? (
      <div
        className={error ? "error" : "notice"}
        role={error ? "alert" : "status"}
      >
        <b>
          {
            {
              idle: "Status",
              approval: "Awaiting wallet approval",
              submitted: "Submitted",
              confirming: "Pending confirmation",
              confirmed: "Confirmed",
              cancelled: "Cancelled",
              failed: "Failed",
              unknown: "Confirmation unavailable",
            }[phase]
          }
        </b>
        <p>{error || note}</p>
        {actionHash && (
          <a
            target="_blank"
            rel="noreferrer"
            href={`${EXPLORER}/txns/${encodeURIComponent(actionHash)}`}
          >
            Inspect latest transaction receipt ↗
          </a>
        )}
      </div>
    ) : null;
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
      setArea("market");
      setError(walletError(e));
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
      setArea("market");
      setError(walletError(e));
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
                Transfer: {
                  asset: proposalAsset,
                  receiver,
                  amount: parseAmount(payment),
                },
              },
            },
        PROPOSAL_FEE,
      );
    } catch (e) {
      setArea("proposal");
      setError(walletError(e));
    }
  }
  let estimate = "Not available";
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
  const enough = (raw: string | undefined, amount: string) => {
    try {
      return BigInt(raw ?? "0") >= BigInt(parseAmount(amount));
    } catch {
      return false;
    }
  };
  const fundedSeeds =
    enough(balances?.vault[0], seedBelief) &&
    enough(balances?.vault[1], seedTusd);
  const validPayment =
    enough(config?.max_payment[proposalAsset], payment) &&
    enough(config?.treasury[proposalAsset], payment);
  const stale = !!updated && now - updated > 45000;
  const disabled =
    busy || !!pending || !account || !config?.ready || stale || !!chainError;
  const blocked = pending
    ? "A submitted transaction needs verification. Use Check pending receipt before sending another action."
    : busy
      ? "Complete or cancel the current wallet request first."
      : !account
        ? "Connect Meteor on testnet to use this control."
        : stale || chainError
          ? "Refresh chain data before sending an action."
          : !config?.ready
            ? "Market data is not ready yet."
            : "";
  const setup = [
    {
      label: "Connect Meteor",
      done: !!account,
      detail:
        "Use your testnet account. Keep testnet NEAR for storage and gas.",
    },
    {
      label: "Get test tokens",
      done: !!account && fts.every((v) => BigInt(v) > 0n),
      detail:
        "Each token faucet registers token storage first (0.01 NEAR attached, excess refunded), then sends 100 tokens.",
    },
    {
      label: "Register market",
      done: !!balances?.registered,
      detail:
        "Separate from token storage. One market registration retains 0.01 NEAR.",
    },
    {
      label: "Deposit to vault",
      done: !!balances?.vault.some((v) => BigInt(v) > 0n),
      detail:
        "Move wallet tokens into your vault with a 1 yoctoNEAR transfer-call deposit.",
    },
    {
      label: "Trade or propose",
      done: false,
      detail:
        "An open proposal also needs claim registration (0.01 NEAR retained). A proposal needs both liquidity stakes and a 0.1 NEAR fee.",
    },
  ];
  return (
    <main id="main">
      <a className="skip-link" href="#decisions">
        Skip to proposals
      </a>
      <header>
        <a className="brand" href="#" aria-label="Bet on Beliefs home">
          b<span aria-hidden="true">↗</span>b{" "}
          <small aria-hidden="true">BET ON BELIEFS</small>
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
              onClick={() => {
                setNote(
                  "Opening Meteor. Allow its popup and choose a testnet account.",
                );
                setArea("");
                void connect(contract).catch((e) => {
                  setNote("");
                  setError(walletError(e));
                });
              }}
            >
              Connect wallet ↗
            </button>
          )}
        </div>
      </header>
      <section className="intro">
        <p className="eyebrow">A decision rule for a shared treasury</p>
        <h1>
          Put your beliefs
          <br />
          on the line<span>.</span>
        </h1>
        <p>
          Trade conditional markets to decide whether a NEAR testnet treasury
          executes a payment or burns BELIEF. The contract reserves the funds,
          compares ten-minute price averages and settles the selected outcome.
        </p>
      </section>
      <nav className="quick-nav" aria-label="App sections">
        <a href="#decisions">View proposals</a>
        <a className="primary-link" href="#funding">
          Get test tokens and set up
        </a>
        <a href="#propose">Propose an action</a>
      </nav>
      <details className="advanced">
        <summary>Advanced: change market contract</summary>
        <form
          className="connection"
          onSubmit={(e) => {
            e.preventDefault();
            if (!validContract(draft)) {
              setArea("");
              setError("Enter a valid .testnet contract account.");
              return;
            }
            setError("");
            setChainError("");
            localStorage.setItem("belief-contract", draft);
            if (draft === contract) {
              void refresh();
              return;
            }
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
      </details>
      <div className="data-status">
        {loading && !config
          ? "Loading deployed market from testnet…"
          : chainError
            ? "Chain data unavailable. Actions are paused."
            : updated
              ? `Testnet data checked at ${new Date(updated).toLocaleTimeString()}.`
              : "No market loaded."}{" "}
        <button
          className="secondary"
          disabled={loading}
          onClick={() => void refresh()}
        >
          Refresh data
        </button>
      </div>
      {pending && (
        <div className="notice">
          <b>Submitted transaction needs verification</b>
          <p>
            Do not resend this action. You can safely check its receipt, even
            after reconnecting.
          </p>
          <a
            href={`${EXPLORER}/txns/${encodeURIComponent(pending.hash)}`}
            target="_blank"
            rel="noreferrer"
          >
            Open saved transaction ↗
          </a>
          <button disabled={busy} onClick={() => void recheck()}>
            Check pending receipt
          </button>
        </div>
      )}
      {stale && (
        <p role="alert" className="error">
          Displayed data is stale. Sending is paused until a successful refresh.
        </p>
      )}
      {((error && !area) || chainError) && (
        <div role="alert" className="error">
          {error || chainError}
        </div>
      )}
      {note && !area && (
        <div role="status" className="notice">
          {note}
        </div>
      )}
      {config && (
        <>
          <section
            className="stats"
            aria-label="Treasury balances and decision rule"
          >
            {names.map((name, i) => (
              <article key={name}>
                <p>Treasury available {name}</p>
                <strong>{format(config.treasury[i])}</strong>
                <small>
                  Reserved {format(config.reserved[i])} · Outgoing{" "}
                  {format(config.outgoing[i])}
                </small>
              </article>
            ))}
            <article>
              <p>THE MECHANISM</p>
              <strong>PASS average &gt; FAIL average × 1.03</strong>
              <small>
                Strictly greater, not equal. Ten-minute interval. 0.30% swap
                fee.
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
          <div className="workspace" id="decisions" tabIndex={-1}>
            <aside>
              <p className="eyebrow">DECISIONS / {config.proposal_count}</p>
              {proposals.length ? (
                proposals.map((q) => (
                  <button
                    aria-pressed={selected === q.id}
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
            <section className="market" data-action-area="market">
              {feedback("market")}
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
                  <p className="result-summary">
                    Outcome:{" "}
                    <b>
                      {p.outcome === null
                        ? "Not decided"
                        : p.outcome
                          ? "PASS"
                          : "FAIL"}
                    </b>
                    . Action execution:{" "}
                    <b>{p.execution.replaceAll("_", " ")}</b>.
                  </p>
                  {p.outcome !== null && (
                    <div className="settled-summary">
                      <h3>This proposal is settled</h3>
                      <p>
                        {p.execution === "executed"
                          ? "The selected action executed. Winning claims can now be redeemed."
                          : p.execution === "rejected"
                            ? "The action was rejected and its reserved budget returned to the treasury. FAIL claims can now be redeemed."
                            : "The decision is final. Check execution status separately before interpreting the result."}
                      </p>
                      <p>
                        Recorded decision averages are not exposed by the
                        deployed contract view. No spot price is presented as a
                        decision average.
                      </p>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={
                          contract === "bob-dhruva-market.testnet" && p.id === 0
                            ? `${EXPLORER}/txns/6phUWCoGJQP7dJH78KMks5jgRXf4d41XfPHkZLcKmWJ4`
                            : `${EXPLORER}/address/${contract}`
                        }
                      >
                        Inspect settlement evidence ↗
                      </a>
                    </div>
                  )}
                  {p.outcome === null && (
                    <div className="worlds">
                      {["PASS", "FAIL"].map((world, s) => (
                        <button
                          key={world}
                          aria-pressed={side === s}
                          className={`world ${side === s ? "chosen" : ""}`}
                          onClick={() => setSide(s)}
                        >
                          <small>Trade {world}</small>
                          <strong>
                            {p.outcome === null && p.pools[s][0] !== "0"
                              ? format(
                                  (
                                    (BigInt(p.pools[s][1]) * UNIT) /
                                    BigInt(p.pools[s][0])
                                  ).toString(),
                                )
                              : "Not available"}{" "}
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
                  )}
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
                                <b>
                                  {balances
                                    ? format(balances.claims[s][a])
                                    : "Loading"}
                                </b>
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                      {p.outcome === null && (
                        <p className="explain">
                          Claim registration is separate from market and token
                          registration. It retains 0.01 testnet NEAR per
                          proposal.
                        </p>
                      )}
                      {!balances?.claims_registered && p.outcome === null && (
                        <button
                          disabled={disabled}
                          onClick={() => send("register_claims", base, FEE)}
                        >
                          Register claims · 0.01 NEAR
                        </button>
                      )}
                      {p.outcome === null ? (
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
                          <p className="control-help">
                            {blocked ||
                              (!balances?.claims_registered
                                ? "Register proposal claims before splitting or trading."
                                : !trading
                                  ? "The trading window has ended. Finalize to unlock redemption."
                                  : "Use deposited vault tokens to split, or existing conditional claims to trade.")}
                          </p>
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
                      ) : (
                        <div className="redemption">
                          <h3>Redeem your winning claims</h3>
                          <label>
                            Redemption asset
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
                            Amount to redeem
                            <input
                              inputMode="decimal"
                              value={size}
                              onChange={(e) => setSize(e.target.value)}
                            />
                          </label>
                          <p>
                            One winning claim returns one underlying token.
                            Redemption retains a 0.01 NEAR operation fee.
                          </p>
                          <button
                            disabled={disabled || !balances?.claims_registered}
                            onClick={() => amountAction("redeem")}
                          >
                            Redeem winner · 0.01 NEAR
                          </button>
                          <p className="control-help">
                            {blocked ||
                              (!balances?.claims_registered
                                ? "You have no registered claim balance for this proposal. Choose an open proposal to participate."
                                : "Redeem only up to your winning claim balance above.")}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {p.outcome === null && (
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
                          busy ||
                          !account ||
                          p.outcome !== null ||
                          trading ||
                          !config?.ready ||
                          stale ||
                          !!chainError
                        }
                        onClick={() => send("finalize", base, FEE)}
                      >
                        Finalize · 0.01 NEAR
                      </button>
                      <button
                        className="secondary"
                        disabled={disabled || p.outcome !== null}
                        onClick={() => send("observe", base)}
                      >
                        Record observation
                      </button>
                      <p className="control-help">
                        {blocked ||
                          (trading
                            ? "Finalization becomes available when the ten-minute window ends."
                            : "The window has ended. Trades are closed; finalization is available.")}
                      </p>
                    </div>
                  )}
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
          <section className="funding" id="funding" tabIndex={-1}>
            <section className="onboarding" aria-labelledby="setup-title">
              <h2 id="setup-title">Your path to a decision</h2>
              <ol>
                {setup.map((step, i) => (
                  <li
                    key={step.label}
                    className={step.done ? "complete" : ""}
                    aria-current={
                      !step.done && setup.slice(0, i).every((v) => v.done)
                        ? "step"
                        : undefined
                    }
                  >
                    <b>
                      {step.done
                        ? "Complete: "
                        : setup.slice(0, i).every((v) => v.done)
                          ? "Next: "
                          : `${i + 1}. `}
                      {step.label}
                    </b>
                  </li>
                ))}
              </ol>
              <details>
                <summary>Setup steps and registration fees</summary>
                {setup.map((step) => (
                  <p key={step.label}>
                    <b>{step.label}.</b> {step.detail}
                  </p>
                ))}
              </details>
              <a href="#funding">Go to token faucets and registration ↓</a>
            </section>
            <div data-action-area="funding">
              {feedback("funding")}
              <p className="eyebrow">Your wallet and vault</p>
              <h2>Get tokens. Prepare your vault.</h2>
              <p>
                Faucets redistribute finite reserves, 100 tokens per call. These
                tokens have no promised value.
              </p>
              <p className="control-help">
                {blocked ||
                  "Token registration and faucet: 0.01 NEAR attached per token plus gas. Existing registration refunds the deposit. Market registration below retains a separate 0.01 NEAR fee."}
              </p>
              {account && !balances?.registered && (
                <button
                  disabled={disabled}
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
                      Your wallet{" "}
                      {account
                        ? fts[a]
                          ? format(fts[a])
                          : "Loading"
                        : "Connect to view"}{" "}
                      · Your vault{" "}
                      {account
                        ? balances
                          ? format(balances.vault[a])
                          : "Loading"
                        : "Connect to view"}
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
                      Get 100 {name}
                    </button>
                    <button
                      disabled={
                        disabled ||
                        !balances?.registered ||
                        !enough(fts[a], size)
                      }
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
                  {account && (
                    <p className="control-help">
                      {blocked ||
                        (!balances?.registered
                          ? "Register your market account before depositing or withdrawing. Donations go to the treasury and cannot be withdrawn to your vault."
                          : "Deposits move wallet tokens into your vault. Withdrawals cost 0.01 NEAR. Donations are irreversible treasury contributions.")}
                    </p>
                  )}
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
            <div id="propose" data-action-area="proposal">
              {feedback("proposal")}
              <p className="eyebrow">Propose an action</p>
              <h2>Create a payment or burn proposal.</h2>
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
                    value={proposalAsset}
                    onChange={(e) => setProposalAsset(+e.target.value)}
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
                execution. Payment cap:{" "}
                {format(config.max_payment[proposalAsset])}{" "}
                {names[proposalAsset]}.
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
              <p className="control-help">
                {blocked ||
                  (config.active !== null
                    ? "Another proposal is active or executing. Wait for it to finish."
                    : !balances?.registered
                      ? "Register your market account and fund both vault stakes first."
                      : !fundedSeeds
                        ? "Deposit both liquidity stakes into your vault before proposing. Proposal creation retains 0.1 NEAR."
                        : !validPayment
                          ? "Choose a payment within the cap and available treasury balance."
                          : "Enter a title and a token-registered testnet recipient. Proposal creation retains 0.1 NEAR.")}
              </p>
              <div className="buttons">
                <button
                  disabled={
                    disabled ||
                    config.active !== null ||
                    !balances?.registered ||
                    !title.trim() ||
                    !fundedSeeds ||
                    !validPayment ||
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
                    !fundedSeeds ||
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
        <p>
          Created and led by <strong>Dhruva Somen Chakrabarty</strong>. Product
          direction, implementation guidance and documented wallet tests. Codex
          assisted with coding, tests and documentation.
        </p>
        <strong>Limits and control</strong>
        <p>
          Scripted testnet trades demonstrate mechanics, not reliable price
          discovery. Thin liquidity and sustained or extreme short manipulation
          can change the outcome. Price is not public welfare. There is no
          independent audit. Owners retain full-access upgrade keys for the
          market and tokens. Testnet only.
        </p>
        <a href="https://github.com/Dhruva-0206/bet-on-beliefs">
          Source and verification evidence ↗
        </a>
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
