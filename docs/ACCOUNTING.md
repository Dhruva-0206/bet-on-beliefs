# Accounting argument and test boundaries

For each asset, keep available treasury T, reserved action R, vault/pending stakes
V, proposal collateral C, and pending outgoing O separate. At a quiescent point
(after all callbacks), the contract's underlying FT balance equals
`T + R + V + sum(C)` and O is zero. While receipts are in flight, O records
suspended obligations: some transfers may already have moved tokens before their
callbacks acknowledge success. It is not an extra spendable FT balance.

Each unresolved proposal maintains `PASS supply = FAIL supply = C` per asset.
Supply includes every holder and the two AMM reserves. Once resolved,
`winning supply = C`; losing claims no longer have redemption rights.

| Transition | Underlying buckets | Conditional supply/ownership |
| --- | --- | --- |
| Valid stake inflow | V increases by received FT | No claims minted |
| Valid treasury inflow | T increases by received FT | No claims minted |
| Proposal seed | V decreases, C increases; T decreases, R increases | Both supplies equal the supplied liquidity; reserves own all initial claims |
| Split | V decreases, C increases equally | Both supplies and both user claims increase equally |
| Swap | No underlying bucket changes | Input claims move user to pool; output claims move pool to user; supplies unchanged |
| Merge scheduled | C decreases, O increases equally | Both supplies and both user claims decrease equally |
| Redemption scheduled | C decreases, O increases equally | Only winning supply and user claim decrease equally |
| Rejection | R decreases, T increases equally | Existing reserve claims move to proposer; no mint |
| Execution scheduled | R decreases, O increases equally | Outcome is fixed; reserves released without minting |
| Successful outgoing callback | O decreases | Previously suspended claims/action stay consumed |
| Failed outgoing callback | O decreases; original V/C/T increases | Merge restores both claims/supplies; redemption restores winner only |

These transitions preserve the equations by addition/subtraction. No reservation
path reads C or V as available treasury. R remains inaccessible to another
proposal. An execution failure returns to T, rather than subsidizing claims.
A failed merge can restore both sides after resolution; only the fixed winner
then redeems. Old proposal callbacks restore that proposal's records even after
a new proposal starts.

Every outgoing operation has a checked monotonically increasing ID and a stored
owner, asset, amount and purpose. The private callback removes the record before
applying its result; a repeated ID returns without crediting. A callback panic
rolls back its receipt atomically on NEAR. Out-of-order callbacks operate on
independent recorded obligations. Active locking persists until the execution
callback. Promise result bytes are bounded: an oversized successful return still
means execution succeeded, so it must not be refunded as a failed transfer.

For a swap, `out = floor(9970*a*y / (10000*x + 9970*a))`. Therefore
`out <= a*y/(x+a)`, hence `(x+a)*(y-out) >= x*y`. The fee stays in the pool,
rounding favors the pool, and minimum output is checked before committing state.
All multiply/divide intermediates and cumulative comparisons use checked U256;
user/bucket additions and subtractions use checked u128. Errors reject the
transaction. Fixed finite token supplies also bound reachable aggregate amounts.

The unit tests check bucket conservation, claim ownership including reserves,
error atomicity, repeated callbacks and out-of-order failures. The sandbox test
compares actual FT balances with the sum of ledgers after receipts settle, and
exercises failed execution, failed merge/redemption, successful payment/burn,
slippage rejection, private exports, repeated initialization/finalization and
no-trade rejection. Oracle fixtures demonstrate both rejecting and successful
manipulation, rather than asserting manipulation resistance.

This is an inductive accounting argument plus executable tests, not a
machine-verified proof or audit. It assumes NEAR receipt atomicity and the
configured token contracts' intended behavior. Deployment keys can replace code
on all three accounts; no immutability, keylessness or adversarial-token safety
claim is made. Direct `ft_transfer` donations bypass inflow accounting after
bootstrap and are not credited; use `ft_transfer_call` with `treasury` instead.
