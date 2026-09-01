import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gemsDirectory = path.join(packageRoot, "vendor", "gems");
const bundledGems = [
  ["rspec-3.12.0", "lib/rspec.rb"],
  ["rspec-core-3.12.2", "lib/rspec/core.rb"],
  ["rspec-expectations-3.12.3", "lib/rspec/expectations.rb"],
  ["rspec-mocks-3.12.6", "lib/rspec/mocks.rb"],
  ["rspec-support-3.12.1", "lib/rspec/support.rb"],
];

for (const [directory, entryPoint] of bundledGems) {
  for (const requiredFile of [entryPoint, "LICENSE.md"]) {
    const filePath = path.join(gemsDirectory, directory, requiredFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Bundled RSpec file is missing: ${filePath}`);
    }
  }
}