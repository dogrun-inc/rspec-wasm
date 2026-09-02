import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PACKAGE_ROOT = path.resolve(__dirname, "..");

function isWithinRoot(filePath, root) {
  const relativePath = path.relative(root, filePath);
  return relativePath === "" || (
    relativePath !== ".." &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function addGemLibraryPaths(possiblePaths, gemsDirectory, relativeFile) {
  if (!fs.existsSync(gemsDirectory)) {
    return;
  }

  for (const directory of fs.readdirSync(gemsDirectory, { withFileTypes: true })) {
    if (directory.isDirectory()) {
      possiblePaths.push(path.join(gemsDirectory, directory.name, "lib", relativeFile));
    }
  }
}

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
 * @param {Object} [options] Resolution options
 * @param {boolean} [options.allowOutsideRoots=false] Allow files outside the workspace and package roots
 * @returns {string|null} JSON string containing { file_path, code } or null
 */
export function resolveRubyModule(moduleName, options = {}) {
  const workspaceRoot = process.cwd();
  const allowedRoots = [workspaceRoot, PACKAGE_ROOT].map((root) => fs.realpathSync(root));
  let cleanName = moduleName.replace(/\\/g, "/");

  // Strip leading slash if followed by drive letter (e.g. /C:/path -> C:/path)
  if (/^\/[a-zA-Z]:/.test(cleanName)) {
    cleanName = cleanName.slice(1);
  }

  const relativeFile = cleanName.endsWith(".rb") ? cleanName : `${cleanName}.rb`;
  const possiblePaths = [];

  // 0. Leading-slash paths are workspace-relative first, then absolute
  if (cleanName.startsWith("/")) {
    possiblePaths.push(path.join(workspaceRoot, cleanName.slice(1)));
    possiblePaths.push(path.join(workspaceRoot, relativeFile.slice(1)));
    possiblePaths.push(cleanName);
    possiblePaths.push(relativeFile);
  } else if (path.isAbsolute(cleanName) || /^[a-zA-Z]:/.test(cleanName)) {
    possiblePaths.push(cleanName);
    possiblePaths.push(relativeFile);
  }

  // 1. Workspace root direct
  possiblePaths.push(path.join(workspaceRoot, relativeFile));
  possiblePaths.push(path.join(workspaceRoot, cleanName));

  // 2. User lib/ directory (e.g. lib/calculator.rb -> require "calculator")
  possiblePaths.push(path.join(workspaceRoot, "lib", relativeFile));

  // 3. User spec/ directory (e.g. spec/calculator_spec.rb -> require "calculator_spec")
  possiblePaths.push(path.join(workspaceRoot, "spec", relativeFile));

  // 4. Package vendor/gems/*/lib/ directory for the bundled RSpec version
  const packageGemsDir = path.join(PACKAGE_ROOT, "vendor", "gems");
  addGemLibraryPaths(possiblePaths, packageGemsDir, relativeFile);

  // 5. Additional gems installed by Bundler under the workspace
  const bundledRubyDir = path.join(workspaceRoot, "vendor", "bundle", "ruby");
  if (fs.existsSync(bundledRubyDir)) {
    for (const rubyDirectory of fs.readdirSync(bundledRubyDir, { withFileTypes: true })) {
      if (rubyDirectory.isDirectory()) {
        addGemLibraryPaths(
          possiblePaths,
          path.join(bundledRubyDir, rubyDirectory.name, "gems"),
          relativeFile
        );
      }
    }
  }

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const realFilePath = fs.realpathSync(filePath);
      if (!options.allowOutsideRoots && !allowedRoots.some((root) => isWithinRoot(realFilePath, root))) {
        continue;
      }

      return JSON.stringify({
        file_path: realFilePath.replace(/\\/g, "/"),
        code: fs.readFileSync(realFilePath, "utf-8"),
      });
    }
  }

  return null;
}

/**
 * Registers globalThis.resolveRubyModule for Ruby VM JS interop
 * @param {Object} [options] Resolution options
 * @param {boolean} [options.allowOutsideRoots=false] Allow files outside the workspace and package roots
 */
export function registerResolverBridge(options = {}) {
  globalThis.resolveRubyModule = (moduleName) => resolveRubyModule(moduleName, options);
}
