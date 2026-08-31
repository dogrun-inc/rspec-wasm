import fs from "node:fs";
import path from "node:path";

const WORKSPACE_ROOT = process.cwd();

/**
 * Recursively scans a directory for files matching *_spec.rb
 * @param {string} dir Relative or absolute path to scan
 * @returns {string[]} Array of relative spec file paths using forward slashes
 */
export function findSpecFiles(dir = "spec") {
  const fullDir = path.isAbsolute(dir) ? dir : path.join(WORKSPACE_ROOT, dir);
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
      const relPath = path.relative(WORKSPACE_ROOT, fullPath).replace(/\\/g, "/");
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
    possiblePaths.push(path.join(WORKSPACE_ROOT, cleanName.slice(1)));
    possiblePaths.push(path.join(WORKSPACE_ROOT, relativeFile.slice(1)));
  }

  // 1. Workspace root direct
  possiblePaths.push(path.join(WORKSPACE_ROOT, relativeFile));
  possiblePaths.push(path.join(WORKSPACE_ROOT, cleanName));

  // 2. lib/ directory (e.g. lib/calculator.rb -> require "calculator")
  possiblePaths.push(path.join(WORKSPACE_ROOT, "lib", relativeFile));

  // 3. spec/ directory (e.g. spec/calculator_spec.rb -> require "calculator_spec")
  possiblePaths.push(path.join(WORKSPACE_ROOT, "spec", relativeFile));

  // 4. vendor/gems/*/lib/ directory for RSpec gems
  const gemsDir = path.join(WORKSPACE_ROOT, "vendor", "gems");
  if (fs.existsSync(gemsDir)) {
    const gemFolders = fs.readdirSync(gemsDir);
    for (const folder of gemFolders) {
      possiblePaths.push(path.join(gemsDir, folder, "lib", relativeFile));
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
