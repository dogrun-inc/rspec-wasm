import test from "node:test";
import assert from "node:assert/strict";
import { createRubyVM, resolveRubyWasmBinary } from "../src/vm.js";
import { runSpecs } from "../src/runner.js";

test("resolveRubyWasmBinary: provides a helpful error when resolution fails", () => {
  const resolutionError = new Error("Cannot find module");

  assert.throws(
    () => resolveRubyWasmBinary(() => { throw resolutionError; }),
    (error) => {
      assert.match(error.message, /Ruby WASM binary could not be resolved/);
      assert.match(error.message, /Please run npm install first/);
      assert.equal(error.cause, resolutionError);
      return true;
    }
  );
});

test("createRubyVM: initializes WASM VM instance and require hook", async () => {
  const vm = await createRubyVM();
  assert.ok(vm);
  const result = vm.eval("1 + 1").toJS();
  assert.equal(result, 2);
  assert.match(vm.eval("RUBY_VERSION").toJS(), /^4\.0\./);
});

test("runSpecs: returns 0 exit code for passing specs", async () => {
  const vm = await createRubyVM();
  const stdoutBefore = vm.eval("$stdout.object_id").toJS();
  const stderrBefore = vm.eval("$stderr.object_id").toJS();
  const exitCode = runSpecs(vm, ["test/fixtures/success_spec.rb"], { silent: true });
  assert.equal(exitCode, 0);
  assert.equal(vm.eval("$stdout.object_id").toJS(), stdoutBefore);
  assert.equal(vm.eval("$stderr.object_id").toJS(), stderrBefore);
});

test("runSpecs: returns non-zero exit code for failing specs", async () => {
  const vm = await createRubyVM();
  const exitCode = runSpecs(vm, ["test/fixtures/failure_spec.rb"], { silent: true });
  assert.notEqual(exitCode, 0);
});
