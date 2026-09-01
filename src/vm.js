import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { DefaultRubyVM } from "@ruby/wasm-wasi/dist/node";
import { registerResolverBridge, PACKAGE_ROOT } from "./resolver.js";

const require = createRequire(import.meta.url);
const RUBY_WASM_BINARY = "@ruby/3.3-wasm-wasi/dist/ruby+stdlib.wasm";

export function resolveRubyWasmBinary(resolve = require.resolve) {
  try {
    return resolve(RUBY_WASM_BINARY);
  } catch (cause) {
    throw new Error(
      `Ruby WASM binary could not be resolved (${RUBY_WASM_BINARY}). Please run npm install first.`,
      { cause }
    );
  }
}

/**
 * Initializes Ruby VM with `@ruby/wasm-wasi` and registers CustomRequireHook from src/require_hook.rb
 * @returns {Promise<import("@ruby/wasm-wasi").RubyVM>} Initialized Ruby VM instance
 */
export async function createRubyVM() {
  // Ensure JS bridge is registered for Ruby VM interop
  registerResolverBridge();

  const binaryPath = resolveRubyWasmBinary();

  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `Ruby WASM binary not found at ${binaryPath}. Please run npm install first.`
    );
  }

  const binary = fs.readFileSync(binaryPath);
  const module = await WebAssembly.compile(binary);
  const { vm } = await DefaultRubyVM(module);

  // Load and evaluate CustomRequireHook from src/require_hook.rb
  const hookPath = path.join(PACKAGE_ROOT, "src", "require_hook.rb");
  const hookCode = fs.readFileSync(hookPath, "utf-8");
  vm.eval(hookCode);

  return vm;
}
