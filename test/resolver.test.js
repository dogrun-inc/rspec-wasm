import test from "node:test";
import assert from "node:assert/strict";
import { findSpecFiles, resolveRubyModule } from "../src/resolver.js";

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

test("resolveRubyModule: resolves vendor rspec gems", () => {
  const resStr = resolveRubyModule("rspec/core");
  assert.ok(resStr !== null);
  const res = JSON.parse(resStr);
  assert.ok(res.file_path.includes("rspec-core"));
  assert.ok(res.code.includes("RSpec"));
});

test("resolveRubyModule: returns null for unknown module", () => {
  const resStr = resolveRubyModule("unknown_module_xyz_123");
  assert.equal(resStr, null);
});
