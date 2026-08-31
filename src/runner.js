/**
 * Executes target RSpec spec files in the given Ruby VM instance
 * @param {import("@ruby/wasm-wasi").RubyVM} vm Initialized Ruby VM instance
 * @param {string[]} specFiles List of spec file paths to run
 * @returns {number} RSpec exit code (0 for success, non-zero for failure)
 */
export function runSpecs(vm, specFiles) {
  if (!specFiles || specFiles.length === 0) {
    console.log("No spec files found to run.");
    return 0;
  }

  const specArgs = ["--color", "--format", "documentation", ...specFiles];

  const rubyRunCode = `
    ENV["HOME"] ||= "/tmp"
    ENV["TERM"] = "xterm-256color"

    require "rspec/core"

    args = ${JSON.stringify(specArgs)}
    status = RSpec::Core::Runner.run(args)
    status
  `;

  const exitCodeResult = vm.eval(rubyRunCode);
  return exitCodeResult.toJS();
}
