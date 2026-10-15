import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gemsDirectory = path.join(packageRoot, "vendor", "gems");
const bundledGems = [
  ["rspec-3.13.2", "lib/rspec.rb"],
  ["rspec-core-3.13.6", "lib/rspec/core.rb"],
  ["rspec-expectations-3.13.5", "lib/rspec/expectations.rb"],
  ["rspec-mocks-3.13.8", "lib/rspec/mocks.rb"],
  ["rspec-support-3.13.7", "lib/rspec/support.rb"],
];

for (const [directory, entryPoint] of bundledGems) {
  for (const requiredFile of [entryPoint, "LICENSE.md"]) {
    const filePath = path.join(gemsDirectory, directory, requiredFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Bundled RSpec file is missing: ${filePath}`);
    }
  }
}