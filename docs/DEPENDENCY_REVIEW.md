# Wallet dependency review — 2026-11-13

## Remediation completed

Pinned a scoped Meteor SDK override to **query-string 10.0.0**, keeping wallet
adapter 10.1.4 and SDK 1.0.24. No forced downgrade was used. The upstream
[10.0.0 release](https://github.com/sindresorhus/query-string/releases/tag/v10.0.0)
removes decode-uri-component and supplies its own single-pass decoder. The
vulnerable package is absent from the lockfile; the old decoder markers are
absent from the rebuilt production chunks.

The SDK expects a named `stringify` export, while v10 uses a default API object.
The guarded SDK transform in `web/vite.config.ts` adapts that exact import during
both Vite dev optimization and production builds, alongside the existing key-log
mitigation. It fails if the expected SDK source changes. This avoids an untested
CommonJS-to-ESM decoder override and does not modify node_modules in place.

Compatibility: SDK popup parameters are all strings. Four golden cases captured
from 7.1.3 retain byte-for-byte encoding, including Unicode, punctuation, query
and fragment characters. The v10 breaking restriction on object-valued stringify
inputs does not affect this inspected call. Node >=22 is required (project pins
24.22.2). Malformed UTF-8 now uses replacement characters, intentionally matching
URLSearchParams; SDK's inspected path does not parse arbitrary queries. Both
advisory-shaped malformed payloads complete in a five-second-bounded subprocess
and match native URLSearchParams decoding. This checks those cases, not every
possible attack or browser.

Validation: clean `npm ci`, 4 unit/compatibility tests, production build,
10 production browser checks and 10 development checks passed. The existing
faucet test carries both token transactions through the actual Meteor adapter
and serialization into a synthetic signing boundary, then cancels without
signing/broadcasting. Browser popup checks also verify pageUri and connectionUid.
The earlier real human faucet receipts are preserved. A repeat human Meteor
BELIEF faucet signature against this serializer update passed on 2026-11-14;
FINAL receipt evidence is in `deployments/human-wallet-post-fix.json`.

Audit now reports **15 low, zero moderate/high/critical**. The two former high
SDK/adapter package findings are now low inherited findings, explaining the
low count change from 13. Remaining findings inherit the elliptic advisory.
Full audit still exits 1 due to those lows; `npm audit --audit-level=moderate`
passes and is now required in frontend CI. See
[remediation evidence](../deployments/dependency-audit-remediated.json).
Hosting remains private per the human's instruction; publication still requires
explicit approval. Contracts, deployment accounts and credentials are unchanged.

## Initial review before remediation

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

Initial recommendation was to retain the private preview until remediation.
The decoder chain is now remediated as recorded above; hosting remains private.
A future public static frontend can use the same testnet contracts, without
uploading deployment credentials. It still needs explicit human approval before
publishing. This review grants no hosting approval, does not waive the findings,
and does not change contract/deployment/key settings.
