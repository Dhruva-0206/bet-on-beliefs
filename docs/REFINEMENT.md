# Release refinement and check scope (2026-11-14)

The running app was reviewed at 1440×1000 and 390×844 before changes. The tall
hero and expanded contract form delayed access to proposals. Settled markets
still showed inactive trading controls. Wallet feedback described submission but
did not independently verify final receipt success in the UI.

## Guidance applied

- [Nielsen Norman Group](https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/): use concise, scannable, factual copy. The supporting sentence now names conditional markets, treasury actions and the decision interval; headings describe the next task.
- [Microsoft Research](https://www.microsoft.com/en-us/research/project/guidelines-for-human-ai-interaction/overview/): use its general clarity, limitations and recovery guidance as a design prompt. This app does not implement AI interaction or claim validation by Microsoft.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): check text contrast, keyboard access, visible focus, labels, status/error announcements, reflow and target size. Buttons use a 44px minimum height, with reduced-motion support and a skip link. These scoped checks do not establish full WCAG compliance.
- [Linear](https://linear.app/features) and [Stripe](https://stripe.com/payments): practical examples of grouped information and clear action hierarchy. The retained dark/lime palette, shorter hero and spacing are project design choices, not research findings. No assets, identity or copy were reused.

## Behavior changes

The deployed testnet market loads by default; arbitrary contracts are behind
Advanced. A visible setup path distinguishes token storage, market registration
and per-proposal claims, with attached deposits versus retained fees explained.
Direct navigation reaches faucets, proposals and proposal creation.

Wallet actions announce approval, submission, pending confirmation, confirmed
final receipts, cancellation and failure. Submitted-but-unverified hashes and
sender IDs are kept in browser session storage. A pending transaction blocks
another submission until a read-only receipt check resolves it. No automatic
transaction retry is sent. Top-level success cannot hide a failed receipt.
Confirmed transaction status is distinct from semantic balance changes; users
are instructed to inspect refreshed balances, including returned unused FT funds.

Settlement separates market outcome from execution. The decision rule is
PASS average > FAIL average × 1.03. The deployed proposal view does not expose
recorded averages, so none are fabricated. Settled proposals emphasize action
status, verified historical evidence for proposal 0, and redemption. Spot prices
appear only for unresolved markets and are labelled as spot prices.

Current data, loading, stale and unavailable states have different labels.
Errors name the action context and give recovery guidance; wallet/vault and
treasury balances use different headings. No keys, contract code or configuration
were changed. No new library or font was introduced.

## Remaining acceptance boundary

Synthetic browser tests exercise wallet boundaries and receipt states; they are
not human signatures. The existing private-origin human faucet tests remain
valid dated evidence. Public-origin connection and one deliberate market
registration require Dhruva's own Meteor signature after publication. The full
human market lifecycle remains distinct from the completed scripted testnet
lifecycle and sandbox scenario. Final evidence and visual/keyboard check results
are recorded in HANDOFF and deployments/.
