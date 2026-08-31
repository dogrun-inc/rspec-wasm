import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, "../bin/rspec-wasm.js");

function runCLI(args = []) {
  return new Promise((resolve) => {
    execFile("node", [cliPath, ...args], (error, stdout, stderr) => {
      resolve({
        code: error ? error.code : 0,
        stdout,
        stderr,
      });
    });
  });
}

test("CLI: runs passing specs and exits with code 0", async () => {
  const result = await runCLI(["test/fixtures/success_spec.rb"]);
  assert.equal(result.code, 0);
  assert.ok(result.stdout.includes("1 example, 0 failures"));
});

test("CLI: runs failing spec and exits with non-zero code", async () => {
  const result = await runCLI(["test/fixtures/failure_spec.rb"]);
  assert.notEqual(result.code, 0);
  assert.ok(result.stdout.includes("1 failure"));
});
