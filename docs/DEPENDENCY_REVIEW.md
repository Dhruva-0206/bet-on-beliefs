# Wallet dependency review — 2026-11-13

`npm audit --prefix web --json` reports **13 low, 4 high**, no moderate or
critical findings. Audit exits 1 because vulnerabilities remain. Public snapshot:
[dependency-audit-review.json](../deployments/dependency-audit-review.json).
No dependency changes or runtime fixes were made during this review.

The four high package findings share this installed chain:

`@near-wallet-selector/meteor-wallet@10.1.4 → @meteorwallet/sdk@1.0.24 → query-string@7.1.3 → decode-uri-component@0.2.2`

| Package | Review |
| --- | --- |
| decode-uri-component | Direct vulnerable decoder. Malformed percent-encoded input can cause excessive CPU use and an unresponsive browser. |
| query-string | Inherits the decoder finding through query parsing; not a separate independent high-severity defect in this report. |
| @meteorwallet/sdk | Inherits findings from query-string (and lower-severity NEAR dependencies). |
| @near-wallet-selector/meteor-wallet | Inherits findings from the SDK (and lower-severity selector/keystore dependencies). |

The maintainer's [exponential decoding advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)
affects versions through 0.4.2 and was fixed in 0.5.0. The later
[quadratic replacement advisory](https://github.com/advisories/GHSA-qr28-fpjm-wq7f)
affects versions through 0.5.0 and requires **0.5.1**. The reported impact is
availability; these advisories do not establish key theft or code execution.

## Exposure in this application

Source inspection: the pinned Meteor SDK imports only `stringify` from
`query-string`, used to construct a popup URL. That function uses encoding, not
this decoder. The app reads wallet callback parameters using native
`URLSearchParams`. However, decoder/parser code is retained in the production
Meteor chunk (including `encodedURI` and `parseFragmentIdentifier` markers).
This review did not prove every transitive path unreachable or run a hostile
input campaign. Human faucet success is functional validation, not a security
assessment. The advisory's server request timing is not a measured browser
freeze time for this application.

## Remediation and hosting decision

npm suggests downgrading the adapter to 6.0.1, a major rollback from the integrated
10.1.4 API. Do not apply `npm audit fix --force`. Patched decoder 0.5.1 is ESM,
while query-string 7.1.3 loads its decoder via CommonJS `require`; a blind override
would cross that module boundary and needs explicit compatibility validation.
Preferred next work: use an upstream-compatible patched dependency path, or a
reviewed compatibility fix, and verify malformed-input handling plus the existing
dev/production faucet-to-Meteor regression. Recheck the resulting lockfile/audit
and repeat a human signed faucet transaction if the wallet adapter path changes.
The same-major nanoid 5.1.16 override already remains in place; it does not fix
this decoder chain.

Recommendation: **retain the private preview while remediating this chain**.
A future public static frontend can use the same testnet contracts, without
uploading deployment credentials. It still needs explicit human approval before
publishing. This review grants no hosting approval, does not waive the findings,
and does not change contract/deployment/key settings.
