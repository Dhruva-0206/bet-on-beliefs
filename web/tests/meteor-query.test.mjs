import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

// Resolve the dependency from Meteor itself, not a separately installed copy.
const require = createRequire(import.meta.url);
const meteorRequire = createRequire(
  require.resolve("@meteorwallet/sdk/package.json"),
);
const queryUrl = pathToFileURL(meteorRequire.resolve("query-string")).href;
const { default: queryString } = await import(queryUrl);

test("Meteor popup parameters match the captured query-string 7 encoding", () => {
  const { fixtures } = JSON.parse(
    readFileSync(new URL("./meteor-query-fixtures.json", import.meta.url)),
  );
  for (const { params, expected } of fixtures) {
    assert.equal(queryString.stringify(params), expected);
    assert.deepEqual({ ...queryString.parse(expected) }, params);
    const native = new URLSearchParams(expected);
    for (const [key, value] of Object.entries(params))
      assert.equal(native.get(key), value);
  }
});

test("malformed percent input completes within a bounded subprocess", () => {
  // Covers both the long malformed sequence and many-distinct-runs failure
  // shapes from the decoder advisories. A vulnerable decoder cannot hang CI.
  const child = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    import queryString from ${JSON.stringify(queryUrl)};
    let distinct = '';
    for (let i = 0; i < 32000; i++) {
      const high = Math.floor(i / 256).toString(16).padStart(2, '0');
      const low = (i % 256).toString(16).padStart(2, '0');
      distinct += '%' + high + '%' + low + 'x';
    }
    const payloads = [distinct + '%zz', '%C2'.repeat(64000) + '%zz'];
    for (const payload of payloads) {
      const input = 'value=' + payload;
      assert.equal(queryString.parse(input).value, new URLSearchParams(input).get('value'));
    }
    console.log('2 malformed-input cases passed');
  `,
    ],
    { timeout: 5000, encoding: "utf8" },
  );
  assert.equal(
    child.error,
    undefined,
    "Decoder exceeded the subprocess bound or failed to launch",
  );
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /2 malformed-input cases passed/);
});
