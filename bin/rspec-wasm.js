#!/usr/bin/env node

import { findSpecFiles } from "../src/resolver.js";
import { createRubyVM } from "../src/vm.js";
import { runSpecs } from "../src/runner.js";

async function main() {
  const cliArgs = process.argv.slice(2);
  let specFiles;

  if (cliArgs.length > 0) {
    // Execute specifically requested spec file(s) from CLI
    specFiles = cliArgs;
  } else {
    // Auto-discover all *_spec.rb files under spec/ in user workspace
    specFiles = findSpecFiles("spec");
  }

  if (specFiles.length === 0) {
    console.log("No spec files found.");
    process.exit(0);
  }

  const vm = await createRubyVM();
  const exitCode = runSpecs(vm, specFiles);

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
