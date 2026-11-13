import { defineConfig } from "vite";

const meteorCompatibilityGuard = {
  name: "meteor-sdk-compatibility",
  // SDK 1.0.24 logs a generated app access key during sign-in. Remove that
  // exact debug statement in both dev dependency optimization and production.
  transform(code: string, id: string) {
    if (!id.includes("/@meteorwallet/sdk/dist/index.js")) return;
    if (!code.includes("console.log(accessKey);"))
      throw new Error("Meteor SDK changed: review access-key log mitigation");
    const oldImport = 'import { stringify } from "query-string";';
    if (!code.includes(oldImport))
      throw new Error("Meteor SDK changed: review query-string compatibility");
    return {
      code: code
        .replace("console.log(accessKey);", "")
        .replace(
          oldImport,
          'import meteorQueryString from "query-string"; const { stringify } = meteorQueryString;',
        ),
      map: null,
    };
  },
};

export default defineConfig({
  define: { global: "globalThis" },
  resolve: { alias: { buffer: "buffer/", process: "process/browser" } },
  optimizeDeps: { rolldownOptions: { plugins: [meteorCompatibilityGuard] } },
  plugins: [meteorCompatibilityGuard],
});
