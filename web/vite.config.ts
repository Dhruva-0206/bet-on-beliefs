import { defineConfig } from "vite";

const meteorKeyLogGuard = {
  name: "meteor-remove-access-key-debug-log",
  // SDK 1.0.24 logs a generated app access key during sign-in. Remove that
  // exact debug statement in both dev dependency optimization and production.
  transform(code: string, id: string) {
    if (!id.includes("/@meteorwallet/sdk/dist/index.js")) return;
    if (!code.includes("console.log(accessKey);"))
      throw new Error("Meteor SDK changed: review access-key log mitigation");
    return { code: code.replace("console.log(accessKey);", ""), map: null };
  },
};

export default defineConfig({
  define: { global: "globalThis" },
  resolve: { alias: { buffer: "buffer/", process: "process/browser" } },
  optimizeDeps: { rolldownOptions: { plugins: [meteorKeyLogGuard] } },
  plugins: [meteorKeyLogGuard],
});
