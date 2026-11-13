import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "browser-tests",
  use: { baseURL: "http://127.0.0.1:4317" },
  webServer: {
    command: process.env.BOB_DEV_BROWSER
      ? "npm run dev -- --host 127.0.0.1 --port 4317 --strictPort"
      : "npm run preview -- --host 127.0.0.1 --port 4317",
    url: "http://127.0.0.1:4317",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
});
