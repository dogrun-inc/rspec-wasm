import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { findSpecFiles, resolveRubyModule } from "../src/resolver.js";

const resolverUrl = pathToFileURL(path.resolve("src/resolver.js")).href;

test("findSpecFiles: auto-discovers spec files in target directory", () => {
  const specs = findSpecFiles("spec");
  assert.ok(Array.isArray(specs));
  assert.ok(specs.includes("spec/calculator_spec.rb"));
  assert.ok(specs.includes("spec/sample_spec.rb"));
});

test("findSpecFiles: returns empty array for non-existent directory", () => {
  const specs = findSpecFiles("non_existent_directory_xyz");
  assert.deepEqual(specs, []);
});

test("findSpecFiles: finds fixtures in test/fixtures", () => {
  const specs = findSpecFiles("test/fixtures");
  assert.ok(specs.includes("test/fixtures/success_spec.rb"));
  assert.ok(specs.includes("test/fixtures/failure_spec.rb"));
});

test("resolveRubyModule: resolves project ruby files", () => {
  const resStr = resolveRubyModule("calculator");
  assert.ok(resStr !== null);
  const res = JSON.parse(resStr);
  assert.ok(res.file_path.endsWith("lib/calculator.rb"));
  assert.ok(res.code.includes("class Calculator"));
});

test("resolveRubyModule: treats a leading slash as workspace-relative", (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(process.cwd(), "leading-slash-test-"));
  const rubyFile = path.join(temporaryDirectory, "workspace_file.rb");
  fs.writeFileSync(rubyFile, "WORKSPACE_VALUE = true\n");

  const previousDirectory = process.cwd();
  process.chdir(temporaryDirectory);
  t.after(() => {
    process.chdir(previousDirectory);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  const resolved = JSON.parse(resolveRubyModule("/workspace_file"));
  assert.equal(resolved.file_path, rubyFile.replace(/\\/g, "/"));
  assert.equal(resolved.code, "WORKSPACE_VALUE = true\n");
});

test("resolveRubyModule: resolves vendor rspec gems", () => {
  const resStr = resolveRubyModule("rspec/core");
  assert.ok(resStr !== null);
  const res = JSON.parse(resStr);
  assert.ok(res.file_path.includes("rspec-core"));
  assert.ok(res.code.includes("RSpec"));
});

test("resolveRubyModule: resolves bundled gems outside the package workspace", (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "rspec-wasm-"));
  t.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

  const output = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import { resolveRubyModule } from ${JSON.stringify(resolverUrl)}; process.stdout.write(resolveRubyModule("rspec/core") || "");`,
    ],
    { cwd: temporaryDirectory, encoding: "utf-8" }
  );

  const resolved = JSON.parse(output);
  assert.ok(resolved.file_path.includes("vendor/gems/rspec-core-3.12.2"));
});

test("resolveRubyModule: resolves gems installed by Bundler", (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(process.cwd(), "bundler-test-"));
  const gemLibrary = path.join(
    temporaryDirectory,
    "vendor/bundle/ruby/4.0.0/gems/example-gem-1.0.0/lib"
  );
  fs.mkdirSync(gemLibrary, { recursive: true });
  fs.writeFileSync(path.join(gemLibrary, "example_gem.rb"), "EXAMPLE_GEM = true\n");

  const previousDirectory = process.cwd();
  process.chdir(temporaryDirectory);
  t.after(() => {
    process.chdir(previousDirectory);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  const resolved = JSON.parse(resolveRubyModule("example_gem"));
  assert.ok(resolved.file_path.includes("vendor/bundle/ruby/4.0.0/gems/example-gem-1.0.0"));
  assert.equal(resolved.code, "EXAMPLE_GEM = true\n");
});

test("resolveRubyModule: returns null for unknown module", () => {
  const resStr = resolveRubyModule("unknown_module_xyz_123");
  assert.equal(resStr, null);
});

test("resolveRubyModule: requires opt-in for files outside allowed roots", (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "rspec-wasm-"));
  const externalRubyFile = path.join(temporaryDirectory, "external.rb");
  fs.writeFileSync(externalRubyFile, "EXTERNAL_VALUE = 42\n");
  t.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

  assert.equal(resolveRubyModule(externalRubyFile), null);
  assert.equal(resolveRubyModule(path.relative(process.cwd(), externalRubyFile)), null);

  const resolved = JSON.parse(resolveRubyModule(externalRubyFile, { allowOutsideRoots: true }));
  assert.equal(resolved.code, "EXTERNAL_VALUE = 42\n");
});
