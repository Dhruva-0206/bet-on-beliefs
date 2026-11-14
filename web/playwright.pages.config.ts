import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "browser-tests",
  testMatch: "faucet.spec.ts",
  use: { baseURL: "http://127.0.0.1:4318/bet-on-beliefs/" },
  webServer: {
    command: "npm run preview:pages",
    url: "http://127.0.0.1:4318/bet-on-beliefs/",
    reuseExistingServer: false,
  },
  projects: [
    { name: "pages-desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "pages-mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
});
