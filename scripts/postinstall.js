import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gemsDirectory = path.join(packageRoot, "vendor", "gems");
const gems = [
  "rspec-core",
  "rspec-expectations",
  "rspec-support",
  "rspec-mocks",
  "rspec",
];

if (!fs.existsSync(gemsDirectory)) {
  fs.mkdirSync(gemsDirectory, { recursive: true });

  for (const gem of gems) {
    execFileSync("gem", ["unpack", gem, "--target", gemsDirectory], {
      cwd: packageRoot,
      stdio: "inherit",
    });
  }
}
