#!/usr/bin/env node

import { findSpecFiles } from "../src/resolver.js";
import { createRubyVM } from "../src/vm.js";
import { runSpecs } from "../src/runner.js";
import { configureWindowsConsole } from "../src/windows_console.js";

configureWindowsConsole();

async function main() {
  const cliArgs = process.argv.slice(2);
  const allowOutsideRoots = cliArgs.includes("--allow-outside-roots");
  const specArgs = cliArgs.filter((arg) => arg !== "--allow-outside-roots");
  let specFiles;

  if (specArgs.length > 0) {
    // Execute specifically requested spec file(s) from CLI
    specFiles = specArgs;
  } else {
    // Auto-discover all *_spec.rb files under spec/ in user workspace
    specFiles = findSpecFiles("spec");
  }

  if (specFiles.length === 0) {
    console.log("No spec files found.");
    process.exit(0);
  }

  const vm = await createRubyVM({ allowOutsideRoots });
  const exitCode = runSpecs(vm, specFiles);

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
