#!/usr/bin/env node

import { findSpecFiles } from "../src/resolver.js";
import { createRubyVM } from "../src/vm.js";
import { runSpecs } from "../src/runner.js";
import { loadConfig, parseCliArguments, runWithConfig } from "../src/config.js";
import { configureWindowsConsole } from "../src/windows_console.js";

configureWindowsConsole();

async function main() {
  const workspaceRoot = process.cwd();
  const { allowOutsideRoots, configPath, specFiles: specArgs } = parseCliArguments(
    process.argv.slice(2)
  );
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

  const config = await loadConfig({ workspaceRoot, configPath });
  const vm = await createRubyVM({ allowOutsideRoots });
  const exitCode = await runWithConfig(
    config,
    { vm, workspaceRoot },
    () => runSpecs(vm, specFiles)
  );

  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
