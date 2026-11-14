# GitHub Pages configuration for approval

**Prepared, not published.** Repository readback: public, `main`, Pages disabled,
no homepage configured. No repository settings, visibility, environment settings
or port visibility were changed. Existing contracts and keys are retained.

Proposed default project URL:
**https://dhruva-0206.github.io/bet-on-beliefs/**
This URL is not claimed live. Compare the eventual Pages output with this URL
before announcing it; a custom domain would require a separate human decision.

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
This does not claim human signing on the future public origin; Meteor may ask
for a fresh connection approval for that origin.

## Approval and publication procedure — not executed

1. Review this file and the workflow. Confirm the latest required CI workflows
   are green and explicitly approve enabling GitHub Pages and publishing at the
   proposed URL. The private preview stays private throughout.
2. After approval only, enable Pages with **GitHub Actions** as its source in
   repository Settings → Pages. Preserve repository visibility and other settings.
3. After approval only, dispatch the prepared workflow on `main` with
   `publish_approved=true`. For an authorized operator, the exact CLI is:
   `gh workflow run pages.yml --ref main -f publish_approved=true`.
   This command has not been executed.
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

The planned **wording/design refinement** also remains pending: use findings from
that walkthrough to refine labels, hierarchy, explanations and desktop/mobile
layout before recording. Hosting approval does not mark either task complete.
Contracts are frozen; any required contract change needs a concrete exception.
No immutability, manipulation-proof or first-on-NEAR claims are introduced.

References checked live on 2026-11-14:
[Vite project-site base and deployment](https://vite.dev/guide/static-deploy.html#github-pages),
[GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
