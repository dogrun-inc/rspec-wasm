import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, parseCliArguments, runWithConfig } from "../src/config.js";

const cliPath = fileURLToPath(new URL("../bin/rspec-wasm.js", import.meta.url));

function createTemporaryWorkspace(t) {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rspec-wasm-config-"));
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  return workspaceRoot;
}

test("parseCliArguments: separates runner options from spec files", () => {
  assert.deepEqual(
    parseCliArguments([
      "--allow-outside-roots",
      "--config",
      "config/test.mjs",
      "spec/example_spec.rb",
    ]),
    {
      allowOutsideRoots: true,
      configPath: "config/test.mjs",
      specFiles: ["spec/example_spec.rb"],
    }
  );
});

test("parseCliArguments: rejects --config without a path", () => {
  assert.throws(() => parseCliArguments(["--config"]), /requires a file path/);
});

test("loadConfig: returns an empty config when no default exists", async (t) => {
  const workspaceRoot = createTemporaryWorkspace(t);
  assert.deepEqual(await loadConfig({ workspaceRoot }), {});
});

test("loadConfig: falls back to the default .js config", async (t) => {
  const workspaceRoot = createTemporaryWorkspace(t);
  fs.writeFileSync(
    path.join(workspaceRoot, "rspec-wasm.config.js"),
    "module.exports = { source: 'js' };\n"
  );

  const config = await loadConfig({ workspaceRoot });
  assert.equal(config.source, "js");
});

test("loadConfig: prefers the default .mjs config and resolves its relative imports", async (t) => {
  const workspaceRoot = createTemporaryWorkspace(t);
  fs.writeFileSync(path.join(workspaceRoot, "value.mjs"), "export default 42;\n");
  fs.writeFileSync(
    path.join(workspaceRoot, "rspec-wasm.config.js"),
    "export default { source: 'js' };\n"
  );
  fs.writeFileSync(
    path.join(workspaceRoot, "rspec-wasm.config.mjs"),
    "import value from './value.mjs'; export default { source: 'mjs', value };\n"
  );

  const config = await loadConfig({ workspaceRoot });
  assert.equal(config.source, "mjs");
  assert.equal(config.value, 42);
});

test("loadConfig: loads an explicit workspace-relative path", async (t) => {
  const workspaceRoot = createTemporaryWorkspace(t);
  fs.mkdirSync(path.join(workspaceRoot, "config"));
  fs.writeFileSync(
    path.join(workspaceRoot, "config", "rspec.mjs"),
    "export default { setup() {}, teardown() {} };\n"
  );

  const config = await loadConfig({ workspaceRoot, configPath: "config/rspec.mjs" });
  assert.equal(typeof config.setup, "function");
  assert.equal(typeof config.teardown, "function");
});

test("loadConfig: validates configuration hooks", async (t) => {
  const workspaceRoot = createTemporaryWorkspace(t);
  fs.writeFileSync(
    path.join(workspaceRoot, "rspec-wasm.config.mjs"),
    "export default { setup: true };\n"
  );

  await assert.rejects(() => loadConfig({ workspaceRoot }), /'setup' must be a function/);
});

test("runWithConfig: awaits setup and always runs teardown", async () => {
  const calls = [];
  const context = { vm: {}, workspaceRoot: "/workspace" };
  const config = {
    async setup(receivedContext) {
      await Promise.resolve();
      assert.equal(receivedContext, context);
      calls.push("setup");
    },
    async teardown(receivedContext) {
      assert.equal(receivedContext, context);
      calls.push("teardown");
    },
  };

  const result = await runWithConfig(config, context, () => {
    calls.push("run");
    return 7;
  });

  assert.equal(result, 7);
  assert.deepEqual(calls, ["setup", "run", "teardown"]);
});

test("runWithConfig: runs teardown when setup fails", async () => {
  const calls = [];
  const error = new Error("setup failed");
  const config = {
    async setup() {
      calls.push("setup");
      throw error;
    },
    async teardown() {
      calls.push("teardown");
    },
  };

  await assert.rejects(
    () => runWithConfig(config, { vm: {}, workspaceRoot: "/workspace" }, () => {
      calls.push("run");
    }),
    error
  );
  assert.deepEqual(calls, ["setup", "teardown"]);
});

test("CLI: awaits setup before loading specs and runs teardown", (t) => {
  const workspaceRoot = createTemporaryWorkspace(t);
  fs.mkdirSync(path.join(workspaceRoot, "spec"));
  fs.writeFileSync(
    path.join(workspaceRoot, "spec", "configured_spec.rb"),
    "RSpec.describe 'configured run' do\n  it('sees setup state') { expect(RSPEC_WASM_SETUP).to eq(42) }\nend\n"
  );
  fs.writeFileSync(
    path.join(workspaceRoot, "rspec-wasm.config.mjs"),
    `import fs from "node:fs";
import path from "node:path";

export default {
  async setup({ vm }) {
    await Promise.resolve();
    vm.eval("RSPEC_WASM_SETUP = 42");
  },
  async teardown({ workspaceRoot }) {
    await fs.promises.writeFile(path.join(workspaceRoot, "teardown.txt"), "done");
  },
};
`
  );

  const output = execFileSync(
    process.execPath,
    [cliPath, "spec/configured_spec.rb"],
    { cwd: workspaceRoot, encoding: "utf-8" }
  );

  assert.match(output, /1 example, 0 failures/);
  assert.equal(fs.readFileSync(path.join(workspaceRoot, "teardown.txt"), "utf-8"), "done");
});