import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_CONFIG_FILES = [
  "rspec-wasm.config.mjs",
  "rspec-wasm.config.js",
];

/**
 * Separates rspec-wasm options from spec file arguments.
 * @param {string[]} args CLI arguments
 * @returns {{ allowOutsideRoots: boolean, configPath: string | undefined, specFiles: string[] }}
 */
export function parseCliArguments(args) {
  const specFiles = [];
  let allowOutsideRoots = false;
  let configPath;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--allow-outside-roots") {
      allowOutsideRoots = true;
    } else if (argument === "--config") {
      configPath = args[index + 1];
      if (!configPath || configPath.startsWith("--")) {
        throw new Error("--config requires a file path.");
      }
      index += 1;
    } else {
      specFiles.push(argument);
    }
  }

  return { allowOutsideRoots, configPath, specFiles };
}

/**
 * Loads an optional ESM configuration from the workspace.
 * @param {Object} [options] Loading options
 * @param {string} [options.workspaceRoot=process.cwd()] Workspace root
 * @param {string} [options.configPath] Explicit configuration path
 * @returns {Promise<{ setup?: Function, teardown?: Function }>} Configuration object
 */
export async function loadConfig(options = {}) {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());
  let resolvedPath;

  if (options.configPath) {
    resolvedPath = path.resolve(workspaceRoot, options.configPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Configuration file not found: ${resolvedPath}`);
    }
  } else {
    resolvedPath = DEFAULT_CONFIG_FILES
      .map((fileName) => path.join(workspaceRoot, fileName))
      .find((candidate) => fs.existsSync(candidate));
  }

  if (!resolvedPath) {
    return {};
  }

  const module = await import(pathToFileURL(resolvedPath).href);
  const config = module.default;

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new TypeError(`Configuration must default-export an object: ${resolvedPath}`);
  }

  for (const hookName of ["setup", "teardown"]) {
    if (config[hookName] !== undefined && typeof config[hookName] !== "function") {
      throw new TypeError(`Configuration '${hookName}' must be a function: ${resolvedPath}`);
    }
  }

  return config;
}

/**
 * Runs an operation between optional asynchronous setup and teardown hooks.
 * @param {{ setup?: Function, teardown?: Function }} config Configuration hooks
 * @param {{ vm: object, workspaceRoot: string }} context Hook context
 * @param {Function} operation Operation to run after setup
 * @returns {Promise<unknown>} Operation result
 */
export async function runWithConfig(config, context, operation) {
  try {
    await config.setup?.(context);
    return await operation();
  } finally {
    await config.teardown?.(context);
  }
}