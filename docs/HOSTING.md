# Static frontend hosting

Live app: https://dhruva-0206.github.io/bet-on-beliefs/.
The frontend uses the existing NEAR testnet contracts and Meteor testnet wallet.
There is no backend service, cron job or AI trader.

## Build and verify

```sh
npm ci --prefix web
VITE_MARKET_CONTRACT=bob-dhruva-market.testnet npm run build:pages --prefix web
npm run test:pages --prefix web
```

The project base is `/bet-on-beliefs/`; public output is `web/dist-pages/`.
The ordinary root preview uses `web/dist/` on 0.0.0.0:5173 with strict port
selection. Keep Codespaces forwarding private. Pages-path tests use a separate
strict local server on 127.0.0.1:4318.

## Workflow

[pages.yml](../.github/workflows/pages.yml) is manual-only on `main`.
`publish_approved` defaults to false: that mode builds and tests without uploading
or deploying. A publishing run requires explicit approval and a true input.
GitHub Pages Source is GitHub Actions. The workflow reads existing hosting
configuration with `enablement: false`; it does not enable hosting itself.

The build uses locked dependencies, an audit gate, unit tests and Pages-path
wallet tests. Only built public assets enter the Pages artifact. Environment
files, credentials, agent instructions, dependencies and caches are excluded.
The deployment job uses Pages/OIDC permissions and the `github-pages` environment.
Pushes run CI but do not automatically deploy.

After an authorized publication, verify the output URL, HTTPS, asset paths,
actual testnet reads and wallet behavior. [Verification](EVIDENCE.md) links
the deployed source, asset hashes, layout checks and completed public-site human
Meteor lifecycle. Hosting does not change contract code or account keys.
