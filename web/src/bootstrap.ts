import { Buffer } from "buffer";
import browserProcess from "process";

// Wallet packages reference Node globals as well as importing buffer. Install
// browser implementations before evaluating React, the selector or any SDK.
const browserGlobals = globalThis as typeof globalThis & {
  Buffer: typeof Buffer;
  process: typeof browserProcess;
};
browserGlobals.Buffer = Buffer;
browserGlobals.process = browserProcess;

// A static main import would execute its dependencies before the assignments.
void import("./main");
