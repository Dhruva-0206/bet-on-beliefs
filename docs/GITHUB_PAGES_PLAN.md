# GitHub Pages release configuration

The creator explicitly approved enabling GitHub Pages and publishing the refined
frontend at the project URL below on 2026-11-14. No further generic hosting
confirmation is needed for this release. Read HANDOFF for actual deployment and
public-origin wallet acceptance status. Existing contracts and keys are retained;
the Codespace preview remains private.

Approved project URL:
**https://dhruva-0206.github.io/bet-on-beliefs/**
Live release verified on 2026-11-14: HTTPS 200, all nine asset hashes matching
the Pages artifact, actual testnet reads and four viewport widths checked.
[Deployment run](https://github.com/Dhruva-0206/bet-on-beliefs/actions/runs/43585261964)
published source bac97ce36bda26c9eebaf77dadc38b3f97b693c9. Public-origin
human wallet signing remains pending. A custom domain requires a separate decision.

## Concrete configuration

- `npm run build:pages --prefix web` produces only browser assets in ignored
  `web/dist-pages/`, with Vite base `/bet-on-beliefs/`. The regular `web/dist/`
  production preview remains independent.
- The workflow supplies public build variable
  `VITE_MARKET_CONTRACT=bob-dhruva-market.testnet`; the deployed market loads by
  default. RPC and Meteor stay testnet. There is no backend, cron or AI trader.
- `.github/workflows/pages.yml` is manual-only (`workflow_dispatch`). Pushing
  this preparation cannot deploy. `publish_approved` defaults to false. The
  boolean is an execution guard, not a substitute for explicit human approval.
- On a manual run, `main` builds with locked npm dependencies, the audit gate,
  unit tests and Pages-path wallet tests. A false approval input only builds;
  it neither packages a Pages artifact nor runs the deploy job.
- With prior human approval and true input, only `web/dist-pages` is packaged.
  The gated deployment job receives Pages/OIDC write permission and targets
  the `github-pages` environment. GitHub's configure action has
  `enablement: false`: this workflow does not enable hosting itself.
- Regular frontend CI now builds and tests the Pages path on push/PR, without
  any publishing actions. The deployment workflow has no push trigger.
- Deployment credentials, `.env` files, AGENTS.md, caches and dependencies are
  not part of the uploaded directory. Generated assets remain ignored locally.
  The only build-time configuration here is a public testnet contract address.

## Local verification

```sh
VITE_MARKET_CONTRACT=bob-dhruva-market.testnet npm run build:pages --prefix web
npm run test:pages --prefix web
```

The Pages browser configuration serves the project prefix locally on
127.0.0.1:4318, strict port selection. It reuses the real faucet/adapter test:
synthetic extension login, BELIEF and tUSD action construction, serialization
into Meteor's signing boundary, cancellation without signatures/broadcasting,
correct URL prefix and no failed asset loads. Desktop and mobile both passed.
The same shared test is checked on the ordinary root production/dev servers.
This does not claim human signing on the public origin; Meteor may ask
for a fresh connection approval for that origin.

## Publication procedure for the approved release

1. Complete refinement, affected verification and staged-diff review. Confirm
   latest required CI workflows are green. Approval for this URL is already
   recorded in the creator's release instruction.
2. After approval only, enable Pages with **GitHub Actions** as its source in
   repository Settings → Pages. Preserve repository visibility and other settings.
3. After approval only, dispatch the prepared workflow on `main` with
   `publish_approved=true`. For an authorized operator, the exact CLI is:
   `gh workflow run pages.yml --ref main -f publish_approved=true`.
   The Codespace dispatch attempt returned HTTP 403. The owner instead ran it
   through the Actions UI with the approval input checked; build and deploy passed.
4. Verify the deployment action's reported URL, public HTTPS, asset loading,
   actual testnet reads and Meteor connection/signing on that origin. Record the
   final receipt evidence and URL. Do not announce a deployment on a failed run.
5. No automatic deployments follow later pushes. Future publication decisions
   remain explicit; this preparation does not authorize social posts/submission.

## Before the final demo

The planned **full application walkthrough** remains pending: wallet, faucet,
market registration, vault funding, proposal/paired liquidity, trading, a clearly
labelled ten-minute wait, finalization/action execution and redemption. Preserve
actual receipts and accounting explanations. A scripted lifecycle already exists
but does not replace the planned human-facing walkthrough.

The release refinement addresses labels, hierarchy, registration guidance,
transaction recovery and desktop/mobile layout. Additional findings from the
full wallet walkthrough can still require refinement before recording. Hosting
and synthetic tests do not complete the human lifecycle acceptance gate.
Contracts are frozen; any required contract change needs a concrete exception.
No immutability, manipulation-proof or first-on-NEAR claims are introduced.

References checked live on 2026-11-14:
[Vite project-site base and deployment](https://vite.dev/guide/static-deploy.html#github-pages),
[GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
