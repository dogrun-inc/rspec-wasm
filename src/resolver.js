import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PACKAGE_ROOT = path.resolve(__dirname, "..");

/**
 * Recursively scans a directory in the user workspace for files matching *_spec.rb
 * @param {string} dir Relative or absolute path to scan (defaults to 'spec')
 * @returns {string[]} Array of relative spec file paths using forward slashes
 */
export function findSpecFiles(dir = "spec") {
  const workspaceRoot = process.cwd();
  const fullDir = path.isAbsolute(dir) ? dir : path.join(workspaceRoot, dir);
  if (!fs.existsSync(fullDir)) {
    return [];
  }

  const results = [];
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSpecFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith("_spec.rb")) {
      const relPath = path.relative(workspaceRoot, fullPath).replace(/\\/g, "/");
      results.push(relPath);
    }
  }

  return results;
}

/**
 * Resolves a Ruby module name to source code and file path on Node.js filesystem
 * @param {string} moduleName Feature or module name requested by Ruby VM
 * @returns {string|null} JSON string containing { file_path, code } or null
 */
export function resolveRubyModule(moduleName) {
  const workspaceRoot = process.cwd();
  let cleanName = moduleName.replace(/\\/g, "/");

  // Strip leading slash if followed by drive letter (e.g. /C:/path -> C:/path)
  if (/^\/[a-zA-Z]:/.test(cleanName)) {
    cleanName = cleanName.slice(1);
  }

  const relativeFile = cleanName.endsWith(".rb") ? cleanName : `${cleanName}.rb`;
  const possiblePaths = [];

  // 0. Absolute or drive-letter path
  if (path.isAbsolute(cleanName) || /^[a-zA-Z]:/.test(cleanName)) {
    possiblePaths.push(cleanName);
    possiblePaths.push(relativeFile);
  } else if (cleanName.startsWith("/")) {
    possiblePaths.push(cleanName);
    possiblePaths.push(relativeFile);
    possiblePaths.push(path.join(workspaceRoot, cleanName.slice(1)));
    possiblePaths.push(path.join(workspaceRoot, relativeFile.slice(1)));
  }

  // 1. Workspace root direct
  possiblePaths.push(path.join(workspaceRoot, relativeFile));
  possiblePaths.push(path.join(workspaceRoot, cleanName));

  // 2. User lib/ directory (e.g. lib/calculator.rb -> require "calculator")
  possiblePaths.push(path.join(workspaceRoot, "lib", relativeFile));

  // 3. User spec/ directory (e.g. spec/calculator_spec.rb -> require "calculator_spec")
  possiblePaths.push(path.join(workspaceRoot, "spec", relativeFile));

  // 4. User vendor/gems/*/lib/ directory
  const userGemsDir = path.join(workspaceRoot, "vendor", "gems");
  if (fs.existsSync(userGemsDir)) {
    const gemFolders = fs.readdirSync(userGemsDir);
    for (const folder of gemFolders) {
      possiblePaths.push(path.join(userGemsDir, folder, "lib", relativeFile));
    }
  }

  // 5. Package vendor/gems/*/lib/ directory for RSpec gems
  const packageGemsDir = path.join(PACKAGE_ROOT, "vendor", "gems");
  if (fs.existsSync(packageGemsDir)) {
    const gemFolders = fs.readdirSync(packageGemsDir);
    for (const folder of gemFolders) {
      possiblePaths.push(path.join(packageGemsDir, folder, "lib", relativeFile));
    }
  }

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return JSON.stringify({
        file_path: filePath.replace(/\\/g, "/"),
        code: fs.readFileSync(filePath, "utf-8"),
      });
    }
  }

  return null;
}

/**
 * Registers globalThis.resolveRubyModule for Ruby VM JS interop
 */
export function registerResolverBridge() {
  globalThis.resolveRubyModule = resolveRubyModule;
}
