# Mechanism design

Status: implemented on NEAR testnet. Validation scopes and remaining limitations are recorded in README and deployments/. This is not an independent audit.

## Scope

NEAR testnet only. Three contracts: fixed initial supply BELIEF (NEP-141, holder burn and bounded faucet), faucet tUSD (NEP-141), and a treasury/conditional-market contract. Both assets use 18 decimals. BELIEF initial supply is 1 billion; 60% treasury, 20% proposer liquidity budget, 20% faucet allocation. Burns reduce supply; the faucet redistributes existing BELIEF rather than minting it.

Only one proposal may be active or executing at a time. Actions are a capped transfer or a burn. There is no arbitrary-call proposal, upgrade proposal, AI trader, or cross-chain integration in the MVP. A permissionless recurring ritual proposes burning 1% of available treasury BELIEF, with a fixed amount captured at creation. The caller supplies both liquidity stakes; treasury funds do not silently subsidize proposal liquidity.

## Accounting and execution

Maintain separate ledgers for available treasury, reserved action funds, pending proposer stakes, conditional collateral, and pending outgoing transfers. Reserve an action's budget at creation; return it on rejection. Successful execution consumes it. Failed execution restores it and exposes an explicit terminal execution-failed result. Market outcome remains fixed even if execution fails; this limitation must be visible to traders. Do not advertise execution failure as proposal rejection.

All FT inflows validate predecessor contract and message before crediting the original sender. Invalid operations return the complete unused amount. Match the stake operation spelling across SDK, contract and UI. Bound titles/descriptions, amounts and storage usage. Charge storage or enforce a documented testnet bound; never leave unlimited publicly funded map growth.

Only private callbacks may complete pending transfers. Debit once before scheduling, record a unique operation, and credit once on failure. Keep active-proposal locking through execution callback. Settlement must tolerate out-of-order callbacks without duplicate credits. Merge and redemption failure paths preserve collateral backing.

## Conditional claims

Depositing one unit of an asset mints one PASS and one FAIL claim for that asset. Before finalization, merging an equal pair returns one underlying unit. At finalization only the selected outcome redeems one-to-one. Claims include user balances and AMM reserves; release reserves to the proposer without minting new claims. Track aggregate supplies for constant-time invariant views.

A one-click trade splits deposited tUSD and spends only the selected side's tUSD. The opposite side's tUSD remains owned by the user. Show all four balances. Do not describe this as an ordinary all-or-nothing bet or promise profits to everyone on the selected side.

Use “Trade PASS” and “Trade FAIL”; explain that higher FAIL valuation means the rejection world is valued more highly. Buying FAIL is not a short position in BELIEF.

## AMM and price arithmetic

Seed both pools with identical conditional reserves from the proposer's deposited BELIEF and tUSD. Constant product, 30 basis-point swap fee, explicit minimum output and nonzero reserve checks. Fees stay in reserves. Use checked U256 intermediates for multiply/divide, cumulative prices and threshold comparisons; reject invalid denominator, overflow, zero output or invalid configuration. User amounts are decimal strings in JSON.

## Oracle policy and design requirements

Use an explicit fixed averaging interval, a 3% strict pass threshold, and a documented time-based observation schedule. Demo window: 10 minutes; demo ritual period: 15 minutes. These are demonstration parameters, not validated production defaults.

The earlier draft's delayed first observation divided by the full interval was incorrect. Integrate exactly from the defined averaging start to the capped end. Account for the previous observation before changing it. Define same-block swaps, late first crank, no trades, long gaps, delayed finalization and boundary equality. Never infer historical prices from a later spot price. Clamp progression must depend on elapsed protocol time, not the number of attacker calls. A skipped interval must not manufacture evidence. The implemented policy carries forward the previous recorded reserve price, integrates before every reserve change, and caps integration at the interval end. Its liveness and manipulation implications are tested and documented in docs/ORACLE.md.

Do not claim a TWAP is manipulation-proof. A final-block attack fixture proves only that fixture. Include sustained manipulation and sparse-crank tests and report their limits.

## Invariants and proof

While trading: for each asset, collateral equals total PASS supply and total FAIL supply, including reserves. After resolution, winning outstanding claims cannot exceed backing. Pending outgoing obligations must remain accounted for until callbacks settle. Treasury and depositor collateral never subsidize each other. Successful swaps cannot decrease constant product after integer rounding. No double finalization, execution or redemption.

## Trust and known limits

No “keyless” badge until ownership is renounced and key removal is explicitly approved and verified. Audit all three contracts' upgrade/admin paths before claiming an immutable system; a keyless treasury alone does not make upgradeable token dependencies trustless. No on-chain method may silently bypass market authorization to spend treasury funds.

Faucet tokens and scripted trades demonstrate mechanics, not economically reliable price discovery. Token price is not public welfare. Automatic execution does not solve conditional-versus-causal inference. Thin liquidity and sustained manipulation remain risks. A single active proposal and sole proposer LP are deliberate MVP constraints.

## References

- https://metadao.com/docs
- https://docs.futarchy.fi/trading-in-futarchy/
- https://hanson.gmu.edu/futarchy.html
- https://docs.near.org/protocol/accounts-contracts/access-keys
- https://nearhackathon.com/HACKATHON.md
