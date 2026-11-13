import { defineConfig } from "vite";

export default defineConfig({
  define: { global: "globalThis" },
  resolve: { alias: { buffer: "buffer/" } },
  plugins: [
    {
      name: "meteor-remove-access-key-debug-log",
      // SDK 1.0.24 logs a generated app access key during sign-in. Remove that
      // exact debug statement before it can enter a browser bundle or console.
      transform(code, id) {
        if (!id.includes("/@meteorwallet/sdk/dist/index.js")) return;
        if (!code.includes("console.log(accessKey);"))
          throw new Error(
            "Meteor SDK changed: review access-key log mitigation",
          );
        return { code: code.replace("console.log(accessKey);", ""), map: null };
      },
    },
  ],
});
